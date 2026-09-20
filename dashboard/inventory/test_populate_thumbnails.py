"""`manage.py populate_thumbnails`: recreate thumbnails + renditions from the originals."""

import io
import re
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from django.conf import settings
from django.core.cache import caches
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from PIL import Image
from versatileimagefield.datastructures.sizedimage import SizedImage

from . import media_pipeline, storagebackends
from .models import Product, ProductImage, ProductVideo

LADDER = [(80, 80), (80, 120), (160, 90)]
_create_resized_image = SizedImage.create_resized_image


def _png(color="red"):
    data = io.BytesIO()
    Image.new("RGB", (600, 400), color).save(data, format="PNG")
    return SimpleUploadedFile("original.png", data.getvalue(), content_type="image/png")


def _can_encode_h264():
    try:
        encoders = subprocess.run(
            [settings.FFMPEG_BIN, "-hide_banner", "-encoders"], capture_output=True, text=True, check=True,
        ).stdout
    except Exception:  # noqa: BLE001
        return False
    return "libx264" in encoders


def _video_stream(path):
    info = subprocess.run(
        [settings.FFMPEG_BIN, "-hide_banner", "-i", str(path)], capture_output=True, text=True,
    ).stderr
    match = re.search(r"Video: (\w+).*?,\s*(\d+)x(\d+)[\s,\[]", info)
    return match[1], int(match[2]), int(match[3])


class PopulateThumbnailsTests(TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(prefix="bb_populate_")
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.export = self.root / "export"
        override = override_settings(
            MEDIA_ROOT=self.root / "media", MEDIA_URL="/media/",
            EXPORT_BACKEND="local", EXPORT_LOCAL_ROOT=self.export,
            IMG_SRCSET=LADDER, VIDEO_SRCSET=[(64, 64), (64, 96)], VIDEO_FORMATS=["mp4"],
            CACHES={
                "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"},
                "versatileimagefield_cache": {
                    "BACKEND": "django.core.cache.backends.filebased.FileBasedCache",
                    "LOCATION": self.root / "cache",
                },
            },
        )
        override.enable()
        self.addCleanup(override.disable)
        storagebackends.export_storage.cache_clear()
        self.addCleanup(storagebackends.export_storage.cache_clear)
        # VIF binds its cache at import time; redirect every bound reference so
        # these tests can never touch the dashboard's real thumbnail cache.
        cache = caches["versatileimagefield_cache"]
        for module in (
            "versatileimagefield.settings", "versatileimagefield.mixins",
            "versatileimagefield.datastructures.mixins", "versatileimagefield.datastructures.sizedimage",
        ):
            cache_patch = patch(f"{module}.cache", cache)
            cache_patch.start()
            self.addCleanup(cache_patch.stop)

    def _product(self, slug="ring", *, published=True, color="red"):
        product = Product.objects.create(slug=slug, name=slug.title(), is_published=published)
        row = ProductImage.objects.create(product=product, image=_png(color))
        return product, row

    def _run(self, *args):
        out = io.StringIO()
        call_command("populate_thumbnails", *args, stdout=out, stderr=io.StringIO())
        return out.getvalue()

    def _folder(self, slug="ring"):
        return self.export / "products_media" / slug

    def _names(self, slug="ring"):
        folder = self._folder(slug)
        return sorted(p.name for p in folder.iterdir()) if folder.exists() else []

    def _assert_size(self, rendition, size):
        with rendition.storage.open(rendition.name, "rb") as data, Image.open(data) as image:
            self.assertEqual(image.size, size)

    # ---------------------------------------------------------------------

    def test_creates_admin_thumbnails_and_every_rendition_without_a_worker(self):
        product, row = self._product()
        product.refresh_from_db()
        self.assertEqual(product.media_status, "queued")
        updated_at = product.updated_at

        output = self._run()

        row.refresh_from_db()
        self.assertTrue(row.thumbnail_url)
        self.assertEqual(len(row.thumbnail_signature), 64)
        for size in LADDER:
            self._assert_size(row.image.crop[f"{size[0]}x{size[1]}"], size)
        self._assert_size(row.image.thumbnail["300x300"], (300, 200))
        names = self._names()
        self.assertEqual(len(names), len(LADDER))
        for size in LADDER:
            self.assertTrue(any(name.endswith(f"_{size[0]}x{size[1]}.webp") for name in names), size)
            with Image.open(self._folder() / next(n for n in names if n.endswith(f"_{size[0]}x{size[1]}.webp"))) as image:
                self.assertEqual((image.size, image.format), (size, "WEBP"))
        product.refresh_from_db()
        self.assertEqual(product.media_status, "ready")
        self.assertIsNotNone(product.media_ready_at)
        self.assertEqual(product.updated_at, updated_at)  # populating never dirties the product
        self.assertIn("populate ok: 1/1 product(s)", output)
        self.assertIn("refresh_inventory", output)

    def test_second_run_reuses_everything(self):
        self._product()
        self._run()
        before = self._names()
        with patch.object(media_pipeline, "_cover_image", side_effect=AssertionError("re-encoded")), patch.object(
            SizedImage, "create_resized_image", side_effect=AssertionError("re-cropped"),
        ):
            output = self._run()
        self.assertEqual(self._names(), before)
        self.assertIn("+0 new, -0 stale", output)
        self.assertNotIn("refresh_inventory", output)

    def test_changed_settings_populate_the_new_ladder(self):
        _, row = self._product()
        self._run()
        with override_settings(IMG_SRCSET=[(100, 180), (80, 80)]):
            output = self._run()
            self._assert_size(row.image.crop["100x180"], (100, 180))
        self.assertTrue(any(name.endswith("_100x180.webp") for name in self._names()))
        self.assertIn("refresh_inventory", output)

    def test_force_recreates_in_place_and_removes_only_stale_files(self):
        _, row = self._product()
        self._run()
        current = self._names()
        (self._folder() / "0_deadbeefdeadbeef_999x999.webp").write_bytes(b"stale")

        with patch.object(media_pipeline, "_cover_image", wraps=media_pipeline._cover_image) as encode, patch.object(
            SizedImage, "create_resized_image", autospec=True, side_effect=_create_resized_image,
        ) as crop:
            output = self._run("--force")

        self.assertEqual(encode.call_count, len(LADDER))          # existing rungs re-encoded anyway
        self.assertEqual(crop.call_count, len(LADDER) + 1)        # every crop + the admin thumbnail
        self.assertEqual(self._names(), current)                  # stale file gone, real rungs intact
        self.assertIn("-1 stale", output)
        self._assert_size(row.image.thumbnail["300x300"], (300, 200))

    def test_default_scope_ids_and_unknown_ids(self):
        self._product("live")
        self._product("draft", published=False)

        self._run()
        self.assertTrue(self._names("live"))
        self.assertEqual(self._names("draft"), [])

        self._run("--all")
        self.assertTrue(self._names("draft"))
        Product.objects.filter(slug="draft").update(media_status="queued")
        with patch.object(media_pipeline, "_cover_image", side_effect=AssertionError("live was touched")):
            self._run("draft")
        self.assertEqual(Product.objects.get(slug="draft").media_status, "ready")

        with self.assertRaisesRegex(CommandError, "unknown product id"):
            self._run("nope")

    def test_missing_original_is_reported_and_never_destroys_published_files(self):
        bad, bad_row = self._product("bad")
        self._product("good", color="blue")
        self._run("bad")
        published = self._names("bad")
        self.assertTrue(published)
        bad_row.image.storage.delete(bad_row.image.name)
        Product.objects.filter(slug="good").update(media_status="queued")

        for extra in ((), ("--force",)):
            with self.subTest(force=bool(extra)), self.assertRaisesRegex(CommandError, "populate failed for bad"):
                self._run(*extra)
            self.assertEqual(self._names("bad"), published)       # nothing deleted on failure

        bad.refresh_from_db()
        self.assertEqual(bad.media_status, "error")
        self.assertIn("FileNotFoundError", bad.media_error)
        self.assertEqual(Product.objects.get(slug="good").media_status, "ready")  # others still processed
        self.assertTrue(self._names("good"))

    @unittest.skipUnless(_can_encode_h264(), "ffmpeg with libx264 unavailable")
    def test_video_renditions_are_created_and_forced_in_place(self):
        product, _ = self._product()
        source = self.root / "clip.mp4"
        subprocess.run([
            settings.FFMPEG_BIN, "-y", "-f", "lavfi", "-i", "testsrc=size=192x108:rate=12:duration=0.25",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-threads", "1", str(source),
        ], capture_output=True, check=True)
        ProductVideo.objects.create(product=product, video=SimpleUploadedFile("clip.mp4", source.read_bytes()))

        self._run()

        mp4s = sorted(p for p in self._folder().iterdir() if p.suffix == ".mp4")
        self.assertEqual(len(mp4s), 2)
        for path, size in zip(mp4s, [(64, 64), (64, 96)]):
            self.assertEqual(_video_stream(path), ("h264", *size))
        self.assertEqual(len([n for n in self._names() if "_poster_" in n]), len(set(LADDER) | {(64, 64), (64, 96)}))

        with patch.object(media_pipeline, "_run", side_effect=AssertionError("cache hit ran ffmpeg")):
            self._run()
        with patch.object(media_pipeline, "_run", wraps=media_pipeline._run) as ffmpeg:
            self._run("--force")
        self.assertEqual(ffmpeg.call_count, 2 + 1)                # two mp4 rungs + one poster frame
