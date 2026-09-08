"""End-to-end tests for the publisher: DB rows -> storage tree."""

import io
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image

from . import publisher, storagebackends
from .models import DeletedProduct, Product, ProductImage, ProductVideo

_TMP = Path(tempfile.mkdtemp(prefix="bb_test_"))


def _png(color=(180, 140, 90), size=(1600, 1600)) -> SimpleUploadedFile:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="PNG")
    return SimpleUploadedFile("orig.png", buf.getvalue(), content_type="image/png")


def _has_ffmpeg() -> bool:
    try:
        subprocess.run([settings.FFMPEG_BIN, "-version"], capture_output=True, check=True)
        return True
    except Exception:
        return False


@override_settings(MEDIA_ROOT=str(_TMP / "media"), EXPORT_BACKEND="local", EXPORT_LOCAL_ROOT=_TMP / "out")
class PublisherTests(TestCase):
    def setUp(self):
        storagebackends.export_storage.cache_clear()
        out = _TMP / "out"
        if out.exists():
            shutil.rmtree(out)
        self.addCleanup(storagebackends.export_storage.cache_clear)

    def _read(self, rel):
        return json.loads((Path(settings.EXPORT_LOCAL_ROOT) / rel).read_text())

    def _product(self, slug="the-test", *, published=True, images=1, **extra):
        p = Product.objects.create(
            slug=slug, name=slug.replace("-", " ").title(), price_from=90000,
            shape="Oval", style="Solitaire", is_published=published, sort_weight=10, **extra,
        )
        for i in range(images):
            ProductImage.objects.create(product=p, image=_png(), alt=f"{slug} {i}", order=i)
        return p

    # -- layout ---------------------------------------------------------

    def test_uploads_land_in_products_raw_media(self):
        p = self._product("raw", images=1)
        name = p.images.first().image.name
        self.assertTrue(name.startswith("products_raw_media/raw/"), name)
        self.assertTrue((Path(settings.MEDIA_ROOT) / name).exists())

    def test_delete_clears_raw_media_dir(self):
        p = self._product("wipe", images=2)
        raw_dir = Path(settings.MEDIA_ROOT) / "products_raw_media" / "wipe"
        self.assertTrue(raw_dir.is_dir())
        p.delete()
        self.assertFalse(raw_dir.exists())

    # -- bulk multi-file upload --------------------------------------

    def test_multifilefield_cleans_to_list(self):
        from inventory.admin import _MultiFileField

        field = _MultiFileField(required=False)
        self.assertEqual(field.clean([]), [])
        self.assertEqual(len(field.clean([_png(), _png(), _png()])), 3)

    def test_bulk_upload_appends_and_dirties(self):
        from inventory.admin import ProductAdmin

        p = self._product("gallery", images=2)  # order 0, 1
        p.mark_published()
        p.refresh_from_db()
        self.assertFalse(p.is_dirty)

        ProductAdmin._save_bulk(p, [_png(), _png(), _png()], ProductImage, "image")

        self.assertEqual(
            list(p.images.order_by("order").values_list("order", flat=True)), [0, 1, 2, 3, 4]
        )
        p.refresh_from_db()
        self.assertTrue(p.is_dirty)  # post_save signal on the new rows

    # -- rebuild_media -------------------------------------------------

    def test_rebuild_media_reencodes_from_originals(self):
        self._product("re", images=1)
        publisher.refresh_all(log=lambda *_: None)
        d = Path(settings.EXPORT_LOCAL_ROOT) / "products_media" / "re"
        before = {f.name: f.read_bytes() for f in d.iterdir()}
        self.assertTrue(before)

        with override_settings(IMAGE_QUALITY=35):
            result = publisher.rebuild_media(log=lambda *_: None)

        after = {f.name: f.read_bytes() for f in d.iterdir()}
        self.assertEqual(set(before), set(after))          # same rung file names
        self.assertNotEqual(before, after)                 # but re-encoded (quality changed)
        self.assertEqual(result["products"], 1)
        self.assertGreaterEqual(result["image_sets"], 1)

    def test_rebuild_media_scoped_and_unknown(self):
        self._product("keep", images=1)
        self._product("touch", images=1)
        publisher.refresh_all(log=lambda *_: None)
        keep_dir = Path(settings.EXPORT_LOCAL_ROOT) / "products_media" / "keep"
        keep_before = {f.name: f.stat().st_mtime_ns for f in keep_dir.iterdir()}

        publisher.rebuild_media(slugs=["touch"], log=lambda *_: None)

        keep_after = {f.name: f.stat().st_mtime_ns for f in keep_dir.iterdir()}
        self.assertEqual(keep_before, keep_after)          # untargeted product untouched

        with self.assertRaises(ValueError):
            publisher.rebuild_media(slugs=["nope"], log=lambda *_: None)

    # -- basic shape ------------------------------------------------------

    def test_refresh_writes_only_published(self):
        self._product("pub", published=True)
        self._product("draft", published=False)
        publisher.refresh_all(log=lambda *_: None)

        catalog = self._read(settings.CATALOG_JSON_PATH)
        self.assertEqual([c["id"] for c in catalog["products"]], ["pub"])
        self.assertTrue((Path(settings.EXPORT_LOCAL_ROOT) / "products/pub.json").exists())
        self.assertFalse((Path(settings.EXPORT_LOCAL_ROOT) / "products/draft.json").exists())

    def test_image_media_object_shape(self):
        self._product("shape", images=1)
        publisher.refresh_all(log=lambda *_: None)
        media = self._read("products/shape.json")["gallery"][0]
        self.assertEqual(media["type"], "image")
        self.assertIn("320w", media["srcset"])
        self.assertIn("1080w", media["srcset"])
        self.assertEqual(media["sizes"], settings.PDP_SIZES)
        self.assertTrue(media["src"].startswith("products_media/shape/"))

    def test_primary_secondary_rule(self):
        self._product("two", images=2)
        publisher.refresh_all(log=lambda *_: None)
        card = next(c for c in self._read(settings.CATALOG_JSON_PATH)["products"] if c["id"] == "two")
        self.assertEqual(card["media"]["primary"]["src"].split("/")[-1][:1], "0")
        self.assertEqual(card["media"]["secondary"]["src"].split("/")[-1][:1], "1")
        self.assertEqual(card["media"]["primary"]["sizes"], settings.CARD_SIZES)

    def test_placeholder_when_no_media(self):
        self._product("bare", images=0)
        publisher.refresh_all(log=lambda *_: None)
        gallery = self._read("products/bare.json")["gallery"]
        self.assertEqual(len(gallery), 1)
        self.assertTrue(gallery[0]["placeholder"])
        card = next(c for c in self._read(settings.CATALOG_JSON_PATH)["products"] if c["id"] == "bare")
        self.assertTrue(card["media"]["primary"]["placeholder"])
        self.assertIsNone(card["media"]["secondary"])

    def test_pdp_extra_merged_first_class_wins(self):
        self._product("merge", pdp_extra={"why_this_works": "keep", "name": "OVERRIDDEN"})
        publisher.refresh_all(log=lambda *_: None)
        data = self._read("products/merge.json")
        self.assertEqual(data["why_this_works"], "keep")
        self.assertEqual(data["name"], "Merge")  # first-class beats pdp_extra

    # -- dirty tracking -------------------------------------------------

    def test_publish_changes_only_touches_dirty(self):
        a = self._product("a")
        b = self._product("b")
        publisher.refresh_all(log=lambda *_: None)
        a.refresh_from_db(); b.refresh_from_db()
        self.assertFalse(a.is_dirty)
        self.assertFalse(b.is_dirty)

        a.name = "A2"
        a.save()  # admin edits go through save() -> auto_now bumps updated_at
        a.refresh_from_db()
        self.assertTrue(a.is_dirty)

        b_mtime = (Path(settings.EXPORT_LOCAL_ROOT) / "products/b.json").stat().st_mtime_ns
        result = publisher.publish_changes(log=lambda *_: None)
        self.assertEqual(result["published"], 1)
        self.assertEqual(
            (Path(settings.EXPORT_LOCAL_ROOT) / "products/b.json").stat().st_mtime_ns, b_mtime
        )
        a.refresh_from_db()
        self.assertFalse(a.is_dirty)

    def test_child_image_change_marks_parent_dirty(self):
        p = self._product("kid")
        publisher.refresh_all(log=lambda *_: None)
        p.refresh_from_db()
        self.assertFalse(p.is_dirty)
        ProductImage.objects.create(product=p, image=_png(), alt="added", order=5)
        p.refresh_from_db()
        self.assertTrue(p.is_dirty)

    def test_delete_removes_files_and_catalog_entry(self):
        self._product("gone")
        self._product("stays")
        publisher.refresh_all(log=lambda *_: None)
        Product.objects.get(slug="gone").delete()
        self.assertEqual(DeletedProduct.objects.filter(slug="gone").count(), 1)

        publisher.publish_changes(log=lambda *_: None)
        self.assertFalse((Path(settings.EXPORT_LOCAL_ROOT) / "products/gone.json").exists())
        self.assertFalse((Path(settings.EXPORT_LOCAL_ROOT) / "products_media/gone").exists())
        ids = [c["id"] for c in self._read(settings.CATALOG_JSON_PATH)["products"]]
        self.assertEqual(ids, ["stays"])
        self.assertEqual(DeletedProduct.objects.count(), 0)

    def test_unpublish_removes_from_storage(self):
        p = self._product("hide")
        publisher.refresh_all(log=lambda *_: None)
        p.is_published = False
        p.save(update_fields=["is_published"])
        publisher.publish_changes(log=lambda *_: None)
        self.assertFalse((Path(settings.EXPORT_LOCAL_ROOT) / "products/hide.json").exists())
        self.assertEqual(self._read(settings.CATALOG_JSON_PATH)["products"], [])

    # -- video (needs ffmpeg) -----------------------------------------

    @unittest.skipUnless(_has_ffmpeg(), "ffmpeg not on PATH")
    @override_settings(VIDEO_SRCSET=[(320, 320), (640, 640)], VIDEO_FORMATS=["mp4", "webm"])
    def test_video_renditions(self):
        p = self._product("clip", images=1)
        tmp = _TMP / "src.mp4"
        subprocess.run(
            [settings.FFMPEG_BIN, "-y", "-f", "lavfi", "-i", "testsrc=size=800x800:rate=15:duration=1",
             "-pix_fmt", "yuv420p", str(tmp)],
            capture_output=True, check=True,
        )
        with tmp.open("rb") as fh:
            v = ProductVideo(product=p, alt="spin", order=0)
            v.video.save("src.mp4", fh, save=True)

        publisher.refresh_all(log=lambda *_: None)
        gallery = self._read("products/clip.json")["gallery"]
        video = [m for m in gallery if m["type"] == "video"][0]
        media_root = Path(settings.EXPORT_LOCAL_ROOT)
        for name in ("320p.mp4", "320p.webm", "640p.mp4", "640p.webm"):
            self.assertTrue(any(f.name.endswith(name) for f in (media_root / "products_media/clip").iterdir()))
        self.assertTrue(video["poster"].endswith(".webp"))
        # webm listed before its mp4 sibling
        types = [s["type"] for s in video["sources"]]
        self.assertLess(types.index("video/webm"), types.index("video/mp4"))
