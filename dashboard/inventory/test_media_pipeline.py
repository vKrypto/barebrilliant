"""Rendition regression tests using isolated export storage and generated media."""

import io
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from django.conf import settings
from django.core.files.base import ContentFile
from django.test import SimpleTestCase, override_settings
from PIL import Image

from . import media_pipeline, storagebackends


def _image_file(*, size=(240, 120), mode="RGB", color="red"):
    output = io.BytesIO()
    Image.new(mode, size, color).save(output, format="PNG")
    return ContentFile(output.getvalue(), name="original.png")


@override_settings(IMAGE_FORMAT="webp", IMAGE_QUALITY=80, IMG_SRCSET=[(64, 64), (96, 96)])
class RenditionTests(SimpleTestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory(prefix="bb_rendition_test_")
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        override = override_settings(EXPORT_BACKEND="local", EXPORT_LOCAL_ROOT=self.root)
        override.enable()
        self.addCleanup(override.disable)
        storagebackends.export_storage.cache_clear()
        self.addCleanup(storagebackends.export_storage.cache_clear)

    def _read_image(self, relative):
        return Image.open(self.root / relative)

    @override_settings(IMG_SRCSET=[(64, 64), (64, 96), (160, 90), (96, 96), (64, 64)])
    def test_all_image_crops_exist_without_duplicate_srcset_widths(self):
        result = media_pipeline.render_image(_image_file(), 0, "Ring", "sample")
        self.assertEqual(len(result["renditions"]), 4)
        for item in result["renditions"]:
            with self._read_image(item["src"]) as image:
                self.assertEqual(image.size, (item["width"], item["height"]))
                self.assertEqual(image.format, "WEBP")
        self.assertEqual([entry.split()[-1] for entry in result["srcset"].split(", ")], ["64w", "96w"])
        self.assertEqual(result["width"], result["height"])
        self.assertEqual(result["mime_type"], "image/webp")

    @override_settings(IMG_SRCSET=[(120, 60), (40, 20), (60, 90)])
    def test_first_aspect_ratio_is_default_even_when_dimensions_are_unsorted(self):
        result = media_pipeline.render_image(_image_file(), 0, "", "landscape")
        self.assertEqual([entry.split()[-1] for entry in result["srcset"].split(", ")], ["40w", "120w"])
        self.assertEqual((result["width"], result["height"]), (120, 60))

    @override_settings(IMAGE_FORMAT="png", IMG_SRCSET=[(60, 60)])
    def test_cover_crop_uses_the_center_instead_of_distorting(self):
        original = Image.new("RGB", (240, 120), "red")
        original.paste("blue", (60, 0, 180, 120))
        output = io.BytesIO()
        original.save(output, format="PNG")
        result = media_pipeline.render_image(ContentFile(output.getvalue()), 0, "", "crop")
        with self._read_image(result["src"]) as image:
            self.assertEqual(image.getpixel((30, 30)), (0, 0, 255))
            self.assertEqual(image.getpixel((10, 30)), (0, 0, 255))
            self.assertEqual(image.getpixel((50, 30)), (0, 0, 255))

    def test_configured_formats_have_matching_bytes_extensions_and_mime(self):
        for image_format, extension, decoded_format, mime in (
            ("jpeg", "jpg", "JPEG", "image/jpeg"),
            ("png", "png", "PNG", "image/png"),
            ("webp", "webp", "WEBP", "image/webp"),
        ):
            with self.subTest(image_format=image_format), override_settings(IMAGE_FORMAT=image_format):
                result = media_pipeline.render_image(
                    _image_file(mode="RGBA", color=(0, 0, 0, 0)), 0, "", "formats",
                )
                self.assertTrue(result["src"].endswith(f".{extension}"))
                self.assertEqual(result["mime_type"], mime)
                with self._read_image(result["src"]) as image:
                    self.assertEqual(image.format, decoded_format)
                    if image_format == "jpeg":
                        self.assertEqual(image.getpixel((20, 20)), (255, 255, 255))

    def test_unchanged_image_uses_existing_renditions(self):
        original = _image_file()
        first = media_pipeline.render_image(original, 0, "First", "cached")
        with mock.patch.object(media_pipeline, "_cover_image", side_effect=AssertionError("Re-encoded")):
            second = media_pipeline.render_image(original, 0, "Updated alt", "cached")
        self.assertEqual(first["src"], second["src"])
        self.assertEqual(second["alt"], "Updated alt")

    def test_source_quality_and_ladder_changes_invalidate_urls(self):
        original = _image_file()
        first = media_pipeline.render_image(original, 0, "", "invalidate")
        with override_settings(IMAGE_QUALITY=35):
            quality_change = media_pipeline.render_image(original, 0, "", "invalidate")
        with override_settings(IMG_SRCSET=[(64, 64), (128, 128)]):
            ladder_change = media_pipeline.render_image(original, 0, "", "invalidate")
        replacement = media_pipeline.render_image(_image_file(color="blue"), 0, "", "invalidate")
        self.assertEqual(len({result["src"] for result in (first, quality_change, ladder_change, replacement)}), 4)
        self.assertTrue((self.root / first["src"]).exists())

    def test_invalid_dimensions_and_formats_fail_clearly(self):
        for dimensions in ([], [(0, 20)], [(20,)], [(20.5, 20)], [(True, 20)]):
            with self.subTest(dimensions=dimensions), override_settings(IMG_SRCSET=dimensions):
                with self.assertRaisesRegex(ValueError, "IMG_SRCSET"):
                    media_pipeline.render_image(_image_file(), 0, "", "invalid")
        with override_settings(IMAGE_FORMAT="invalid"):
            with self.assertRaisesRegex(ValueError, "IMAGE_FORMAT"):
                media_pipeline.render_image(_image_file(), 0, "", "invalid")
        with override_settings(VIDEO_SRCSET=[(63, 64)]):
            with self.assertRaisesRegex(ValueError, "even"):
                media_pipeline.render_video(ContentFile(b""), 0, "", "invalid")
        with override_settings(VIDEO_FORMATS=[]):
            with self.assertRaisesRegex(ValueError, "VIDEO_FORMATS"):
                media_pipeline.render_video(ContentFile(b""), 0, "", "invalid")

    @override_settings(IMG_SRCSET=[(64, 64)], VIDEO_SRCSET=[(64, 64)], VIDEO_FORMATS=["mp4", "webm"])
    def test_encoding_settings_and_posters_invalidate_video_cache(self):
        signature = media_pipeline.rendition_config_signature("video")
        for key, value in (
            ("VIDEO_H264_CRF", settings.VIDEO_H264_CRF + 1),
            ("VIDEO_AV1_CRF", settings.VIDEO_AV1_CRF + 1),
            ("VIDEO_AV1_PRESET", settings.VIDEO_AV1_PRESET + 1),
            ("VIDEO_FORMATS", ["mp4"]),
            ("VIDEO_SRCSET", [(128, 64)]),
            ("IMG_SRCSET", [(64, 96)]),
            ("IMAGE_QUALITY", 35),
            ("IMAGE_FORMAT", "jpeg"),
        ):
            with self.subTest(setting=key), override_settings(**{key: value}):
                self.assertNotEqual(signature, media_pipeline.rendition_config_signature("video"))

    @override_settings(
        VIDEO_SRCSET=[(64, 64), (64, 96), (96, 96)], VIDEO_FORMATS=["mp4", "webm"],
        VIDEO_H264_CRF=29, VIDEO_AV1_CRF=41, VIDEO_AV1_PRESET=10,
    )
    def test_video_encoder_arguments_and_cached_skip(self):
        commands = []

        def fake_run(command):
            commands.append(command)
            destination = Path(command[-1])
            if destination.suffix == ".png":
                Image.new("RGB", (192, 108), "blue").save(destination)
            else:
                destination.write_bytes(b"encoded video")

        original = ContentFile(b"video-original")
        with mock.patch.object(media_pipeline, "_run", side_effect=fake_run):
            result = media_pipeline.render_video(original, 0, "Turntable", "video")
        self.assertEqual(len(result["renditions"]), 6)
        self.assertEqual([item["type"] for item in result["sources"]], ["video/webm", "video/mp4"] * 2)
        self.assertEqual(len({item["src"] for item in result["renditions"]}), 6)
        self.assertEqual(len(result["poster_renditions"]), 3)
        for command in commands:
            if command[-1].endswith(".png"):
                continue
            self.assertIn("force_original_aspect_ratio=increase", command[command.index("-vf") + 1])
            self.assertIn("crop=", command[command.index("-vf") + 1])
            if command[-1].endswith(".webm"):
                self.assertEqual(command[command.index("-crf") + 1], "41")
                self.assertEqual(command[command.index("-preset") + 1], "10")
            else:
                self.assertEqual(command[command.index("-crf") + 1], "29")
        with mock.patch.object(media_pipeline, "_run", side_effect=AssertionError("Cache hit invoked ffmpeg")):
            repeated = media_pipeline.render_video(original, 0, "Turntable", "video")
        self.assertEqual(result, repeated)

    @unittest.skipUnless(shutil.which(settings.FFMPEG_BIN) and shutil.which(settings.FFPROBE_BIN), "ffmpeg/ffprobe unavailable")
    @override_settings(
        VIDEO_SRCSET=[(64, 64), (64, 96), (224, 126), (96, 96)],
        VIDEO_FORMATS=["mp4"], IMAGE_FORMAT="jpeg", IMG_SRCSET=[(48, 48), (64, 96)],
    )
    def test_real_video_crops_and_posters_have_exact_configured_dimensions(self):
        original = self.root / "fixture.mp4"
        subprocess.run([
            settings.FFMPEG_BIN, "-y", "-f", "lavfi", "-i", "testsrc=size=192x108:rate=12:duration=0.25",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-threads", "1", str(original),
        ], capture_output=True, check=True)
        video = media_pipeline.render_video(ContentFile(original.read_bytes()), 0, "", "actual")
        self.assertEqual(len(video["renditions"]), 4)
        for item in video["renditions"]:
            probe = subprocess.run([
                settings.FFPROBE_BIN, "-v", "error", "-select_streams", "v:0", "-show_entries",
                "stream=width,height,sample_aspect_ratio,codec_name", "-of", "json", str(self.root / item["src"]),
            ], capture_output=True, text=True, check=True)
            stream = json.loads(probe.stdout)["streams"][0]
            self.assertEqual((stream["width"], stream["height"]), (item["width"], item["height"]))
            self.assertEqual(stream["sample_aspect_ratio"], "1:1")
            self.assertEqual(stream["codec_name"], "h264")
        self.assertEqual(len(video["poster_renditions"]), 5)
        for item in video["poster_renditions"]:
            with self._read_image(item["src"]) as image:
                self.assertEqual(image.size, (item["width"], item["height"]))
                self.assertEqual(image.format, "JPEG")
        self.assertEqual((video["width"], video["height"]), (96, 96))
