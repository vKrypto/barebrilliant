"""Real thumbnail and cache behavior, isolated from uploaded inventory files."""

import io
import tempfile
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

from django.core.cache import caches
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image

from .image_cache import delete_image_cache, warm_image_cache
from .models import Product, ProductImage


def _upload(color="red"):
    data = io.BytesIO()
    Image.new("RGB", (600, 400), color).save(data, format="PNG")
    return SimpleUploadedFile("original.png", data.getvalue(), content_type="image/png")


class ImageCacheTests(TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(prefix="bb_image_cache_")
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        settings_override = override_settings(
            MEDIA_ROOT=self.root / "media",
            MEDIA_URL="/media/",
            EXPORT_BACKEND="local",
            EXPORT_LOCAL_ROOT=self.root / "export",
            IMG_SRCSET=[(80, 80), (80, 120), (160, 90)],
            CACHES={
                "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"},
                "versatileimagefield_cache": {
                    "BACKEND": "django.core.cache.backends.filebased.FileBasedCache",
                    "LOCATION": self.root / "cache",
                },
            },
        )
        settings_override.enable()
        self.addCleanup(settings_override.disable)
        self.cache = caches["versatileimagefield_cache"]
        # VIF binds cache objects at import time. Redirect every bound reference
        # so these tests cannot populate or clear the dashboard's real cache.
        for module in (
            "versatileimagefield.settings",
            "versatileimagefield.mixins",
            "versatileimagefield.datastructures.mixins",
            "versatileimagefield.datastructures.sizedimage",
        ):
            cache_patch = patch(f"{module}.cache", self.cache)
            cache_patch.start()
            self.addCleanup(cache_patch.stop)
        self.product = Product.objects.create(slug="cache-test", name="Cache test")
        self.row = ProductImage.objects.create(product=self.product, image=_upload())

    def _assert_image(self, rendition, size, color=None):
        with rendition.storage.open(rendition.name, "rb") as data, Image.open(data) as image:
            self.assertEqual(image.size, size)
            if color is not None:
                self.assertEqual(image.getpixel((0, 0)), color)

    def test_background_warm_creates_all_aspects_and_persists_preview(self):
        self.product.refresh_from_db()
        updated_at = self.product.updated_at

        url = warm_image_cache(self.row)

        for size in [(80, 80), (80, 120), (160, 90)]:
            crop = self.row.image.crop[f"{size[0]}x{size[1]}"]
            self._assert_image(crop, size)
            self.assertTrue(self.cache.get(crop.url))
        thumbnail = self.row.image.thumbnail["300x300"]
        self._assert_image(thumbnail, (300, 200))
        self.assertTrue(self.cache.get(thumbnail.url))
        self.row.refresh_from_db()
        self.assertEqual(self.row.thumbnail_url, url)
        self.assertEqual(len(self.row.thumbnail_signature), 64)
        self.assertEqual(parse_qs(urlsplit(url).query)["v"], [self.row.thumbnail_signature[:16]])
        self.product.refresh_from_db()
        self.assertEqual(self.product.updated_at, updated_at)

    def test_reading_uncached_rendition_never_generates_it(self):
        self.assertFalse(self.row.image.create_on_demand)
        missing = self.row.image.crop["99x101"]
        self.assertFalse(missing.storage.exists(missing.name))
        self.assertTrue(missing.url)
        self.assertFalse(missing.storage.exists(missing.name))

    def test_unchanged_image_reuses_existing_files(self):
        original_url = warm_image_cache(self.row)
        with patch(
            "versatileimagefield.datastructures.sizedimage.SizedImage.create_resized_image",
            side_effect=AssertionError("An unchanged rendition should be reused"),
        ):
            self.assertEqual(warm_image_cache(self.row), original_url)

    def test_same_path_overwrite_invalidates_files_cache_and_preview_version(self):
        previous_url = warm_image_cache(self.row)
        previous_signature = self.row.thumbnail_signature
        with self.row.image.storage.open(self.row.image.name, "wb") as original:
            Image.new("RGB", (600, 400), "blue").save(original, format="PNG")

        updated_url = warm_image_cache(self.row)

        self.assertNotEqual(self.row.thumbnail_signature, previous_signature)
        self.assertNotEqual(updated_url, previous_url)
        self._assert_image(self.row.image.crop["80x120"], (80, 120), (0, 0, 255))
        self._assert_image(self.row.image.thumbnail["300x300"], (300, 200), (0, 0, 255))

    def test_settings_change_replaces_old_renditions(self):
        warm_image_cache(self.row)
        previous_signature = self.row.thumbnail_signature
        old_crop = self.row.image.crop["80x120"]

        with override_settings(IMG_SRCSET=[(100, 180)]):
            warm_image_cache(self.row)

        self.assertNotEqual(self.row.thumbnail_signature, previous_signature)
        self.assertFalse(old_crop.storage.exists(old_crop.name))
        self.assertIsNone(self.cache.get(old_crop.url))
        self._assert_image(self.row.image.crop["100x180"], (100, 180))

    def test_missing_thumbnail_is_repaired_despite_cached_existence(self):
        warm_image_cache(self.row)
        thumbnail = self.row.image.thumbnail["300x300"]
        thumbnail.storage.delete(thumbnail.name)
        self.assertTrue(self.cache.get(thumbnail.url))

        warm_image_cache(self.row)

        self._assert_image(thumbnail, (300, 200))

    def test_derivative_cleanup_preserves_original(self):
        warm_image_cache(self.row)
        thumbnail = self.row.image.thumbnail["300x300"]
        crop = self.row.image.crop["80x120"]

        delete_image_cache(self.row.image)

        self.assertTrue(self.row.image.storage.exists(self.row.image.name))
        self.assertFalse(thumbnail.storage.exists(thumbnail.name))
        self.assertFalse(crop.storage.exists(crop.name))
        self.assertIsNone(self.cache.get(thumbnail.url))
        self.assertIsNone(self.cache.get(crop.url))

    def test_warmer_failure_does_not_mark_preview_ready(self):
        with patch("inventory.image_cache.VersatileImageFieldWarmer") as warmer:
            warmer.return_value.warm.return_value = (0, [self.row.image.name])
            with self.assertRaisesRegex(RuntimeError, "Thumbnail generation failed"):
                warm_image_cache(self.row)
        self.row.refresh_from_db()
        self.assertEqual(self.row.thumbnail_signature, "")
        self.assertEqual(self.row.thumbnail_url, "")

    def test_replaced_row_is_not_marked_ready_by_stale_job(self):
        with patch("inventory.image_cache.VersatileImageFieldWarmer") as warmer:
            def replace_while_warming():
                ProductImage.objects.filter(pk=self.row.pk).update(image="replacement.png")
                return 4, []

            warmer.return_value.warm.side_effect = replace_while_warming
            with self.assertRaisesRegex(RuntimeError, "replaced or deleted"):
                warm_image_cache(self.row)
        self.row.refresh_from_db()
        self.assertEqual(self.row.image.name, "replacement.png")
        self.assertEqual(self.row.thumbnail_signature, "")
        self.assertEqual(self.row.thumbnail_url, "")

    def test_invalid_config_fails_before_deleting_existing_thumbnails(self):
        warm_image_cache(self.row)
        thumbnail = self.row.image.thumbnail["300x300"]
        with override_settings(IMG_SRCSET=[(0, 100)]):
            with self.assertRaisesRegex(ValueError, "positive integers"):
                warm_image_cache(self.row)
        self.assertTrue(thumbnail.storage.exists(thumbnail.name))
