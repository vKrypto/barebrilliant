"""Generate configured, cover-cropped image/video renditions for the storefront.

Every output name includes the original bytes and its encoding configuration, so
replacing an upload or changing settings gives it a fresh cacheable URL. All
configured dimensions are generated, including different crops with equal widths.
The first configured aspect ratio supplies the existing ``srcset``/``sources``
contract; ``renditions`` also exposes the other crops without duplicate descriptors.
"""

from __future__ import annotations

import hashlib
import io
import json
import subprocess
import tempfile
from pathlib import Path

from django.conf import settings
from PIL import Image, ImageOps

from . import storagebackends

# Bump when the crop/encoding implementation changes to invalidate existing files.
_PIPELINE_VERSION = 2
_IMAGE_FORMATS = {
    "webp": ("WEBP", "webp", "image/webp"),
    "jpg": ("JPEG", "jpg", "image/jpeg"),
    "jpeg": ("JPEG", "jpg", "image/jpeg"),
    "png": ("PNG", "png", "image/png"),
    "avif": ("AVIF", "avif", "image/avif"),
}


def _read_bytes(field_file) -> bytes:
    field_file.open("rb")
    try:
        return field_file.read()
    finally:
        field_file.close()


def hash6(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()[:6]


def _dimensions(setting_name: str, *, video: bool = False) -> list[tuple[int, int]]:
    """Preserve the first aspect ratio and reject ambiguous/invalid dimensions."""
    dimensions = []
    for size in getattr(settings, setting_name):
        if (
            not isinstance(size, (tuple, list)) or len(size) != 2
            or any(type(value) is not int or value <= 0 for value in size)
        ):
            raise ValueError(f"{setting_name} must contain positive integer (width, height) pairs")
        pair = tuple(size)
        if video and any(value % 2 for value in pair):
            raise ValueError(f"{setting_name} dimensions must be even for H.264/AV1: {pair}")
        if pair not in dimensions:
            dimensions.append(pair)
    if not dimensions:
        raise ValueError(f"{setting_name} must contain at least one (width, height) pair")
    return dimensions


def _image_encoding() -> tuple[str, str, str]:
    configured = str(settings.IMAGE_FORMAT).lower().lstrip(".")
    if configured not in _IMAGE_FORMATS:
        raise ValueError(f"Unsupported IMAGE_FORMAT: {settings.IMAGE_FORMAT!r}")
    quality = settings.IMAGE_QUALITY
    if type(quality) is not int or not 1 <= quality <= 100:
        raise ValueError("IMAGE_QUALITY must be an integer between 1 and 100")
    return _IMAGE_FORMATS[configured]


def _video_formats() -> list[str]:
    configured = {str(value).lower() for value in settings.VIDEO_FORMATS}
    if not configured or configured - {"mp4", "webm"}:
        raise ValueError("VIDEO_FORMATS must contain mp4 and/or webm")
    # Interleave each size with AV1 first, then the universal H.264 fallback.
    return [value for value in ("webm", "mp4") if value in configured]


def rendition_config_signature(kind: str) -> str:
    """Stable cache version shared with background media preparation."""
    config = {
        "version": _PIPELINE_VERSION,
        "kind": kind,
        "image_dimensions": _dimensions("IMG_SRCSET"),
        "image_format": _image_encoding()[0],
        "image_quality": settings.IMAGE_QUALITY,
    }
    if kind == "video":
        config.update(
            video_dimensions=_dimensions("VIDEO_SRCSET", video=True),
            video_formats=_video_formats(),
            h264_crf=settings.VIDEO_H264_CRF,
            av1_crf=settings.VIDEO_AV1_CRF,
            av1_preset=settings.VIDEO_AV1_PRESET,
        )
    elif kind != "image":
        raise ValueError(f"Unknown media kind: {kind!r}")
    return hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()[:16]


def _cache_key(raw: bytes, kind: str) -> str:
    digest = hashlib.sha256(raw)
    digest.update(rendition_config_signature(kind).encode())
    return digest.hexdigest()[:16]


def _same_aspect(size: tuple[int, int], reference: tuple[int, int]) -> bool:
    return size[0] * reference[1] == size[1] * reference[0]


def _default_renditions(renditions: list[dict], size: tuple[int, int]) -> list[dict]:
    return sorted(
        (item for item in renditions if _same_aspect((item["width"], item["height"]), size)),
        key=lambda item: item["width"],
    )


def _srcset(renditions: list[dict]) -> str:
    return ", ".join(f"{item['src']} {item['width']}w" for item in renditions)


def _cover_image(img: Image.Image, size: tuple[int, int]) -> bytes:
    """Respect camera orientation, crop to the exact box, and encode as configured."""
    image_format, _extension, _mime = _image_encoding()
    img = ImageOps.exif_transpose(img)
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if "A" in img.getbands() or "transparency" in img.info else "RGB")
    fitted = ImageOps.fit(img, size, method=Image.Resampling.LANCZOS)
    if image_format == "JPEG" and fitted.mode == "RGBA":
        background = Image.new("RGB", fitted.size, "white")
        background.paste(fitted, mask=fitted.getchannel("A"))
        fitted = background
    options = {"quality": settings.IMAGE_QUALITY}
    if image_format == "WEBP":
        options["method"] = 6
    elif image_format == "PNG":
        options = {"optimize": True}
    buf = io.BytesIO()
    fitted.save(buf, format=image_format, **options)
    return buf.getvalue()


def _image_renditions(base: str, key: str, dimensions: list[tuple[int, int]]) -> list[dict]:
    _format, extension, mime = _image_encoding()
    return [
        {"src": f"{base}/{key}_{w}x{h}.{extension}", "width": w, "height": h, "type": mime}
        for w, h in dimensions
    ]


def _save_image_renditions(img: Image.Image, renditions: list[dict]) -> None:
    for item in renditions:
        storagebackends.save_bytes(item["src"], _cover_image(img, (item["width"], item["height"])))


def render_image(field_file, order: int, alt: str, slug: str) -> dict:
    dimensions = _dimensions("IMG_SRCSET")
    raw = _read_bytes(field_file)
    key = f"{order}_{_cache_key(raw, 'image')}"
    renditions = _image_renditions(f"{settings.MEDIA_DIR}/{slug}", key, dimensions)
    missing = [item for item in renditions if not storagebackends.exists(item["src"])]
    if missing:
        with Image.open(io.BytesIO(raw)) as img:
            img.load()
            _save_image_renditions(img, missing)

    defaults = _default_renditions(renditions, dimensions[0])
    chosen = defaults[len(defaults) // 2]
    return {
        "type": "image",
        "alt": alt,
        "src": chosen["src"],
        "srcset": _srcset(defaults),
        "sizes": "",
        "width": chosen["width"],
        "height": chosen["height"],
        "mime_type": chosen["type"],
        "renditions": renditions,
    }


def _run(cmd: list[str]) -> subprocess.CompletedProcess:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        tail = (proc.stderr or "").strip().splitlines()[-8:]
        raise RuntimeError(f"{Path(cmd[0]).name} failed ({proc.returncode}):\n" + "\n".join(tail))
    return proc


def _cover_filter(width: int, height: int) -> str:
    return (
        f"scale={width}:{height}:force_original_aspect_ratio=increase:force_divisible_by=2,"
        f"crop={width}:{height},setsar=1"
    )


def _encode_video(source: Path, destination: Path, rendition: dict) -> None:
    command = [
        settings.FFMPEG_BIN, "-y", "-i", str(source),
        "-map", "0:v:0", "-map", "0:a:0?",
        "-vf", _cover_filter(rendition["width"], rendition["height"]),
        "-pix_fmt", "yuv420p",
    ]
    if rendition["type"] == "video/webm":
        command += [
            "-c:v", "libsvtav1", "-crf", str(settings.VIDEO_AV1_CRF),
            "-preset", str(settings.VIDEO_AV1_PRESET),
            "-c:a", "libopus", "-b:a", "128k",
        ]
    else:
        command += [
            "-c:v", "libx264", "-crf", str(settings.VIDEO_H264_CRF), "-preset", "medium",
            "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
        ]
    _run([*command, str(destination)])
    storagebackends.save_bytes(rendition["src"], destination.read_bytes())


def render_video(field_file, order: int, alt: str, slug: str) -> dict:
    dimensions = _dimensions("VIDEO_SRCSET", video=True)
    formats = _video_formats()
    raw = _read_bytes(field_file)
    key = f"{order}_{_cache_key(raw, 'video')}"
    base = f"{settings.MEDIA_DIR}/{slug}"
    renditions = [
        {"src": f"{base}/{key}_{w}x{h}.{fmt}", "type": f"video/{fmt}", "width": w, "height": h}
        for w, h in dimensions for fmt in formats
    ]
    # Populate the image ladder and a matching poster for every video crop.
    poster_dimensions = list(dict.fromkeys([*_dimensions("IMG_SRCSET"), *dimensions]))
    posters = _image_renditions(base, f"{key}_poster", poster_dimensions)
    missing_videos = [item for item in renditions if not storagebackends.exists(item["src"])]
    missing_posters = [item for item in posters if not storagebackends.exists(item["src"])]

    if missing_videos or missing_posters:
        with tempfile.TemporaryDirectory(prefix="bb_vid_") as tmp:
            source = Path(tmp) / "original"
            source.write_bytes(raw)
            for item in missing_videos:
                destination = Path(tmp) / Path(item["src"]).name
                _encode_video(source, destination, item)
            if missing_posters:
                frame = Path(tmp) / "poster.png"
                _run([
                    settings.FFMPEG_BIN, "-y", "-ss", "0", "-i", str(source),
                    "-map", "0:v:0", "-frames:v", "1", str(frame),
                ])
                with Image.open(frame) as img:
                    img.load()
                    _save_image_renditions(img, missing_posters)

    defaults = _default_renditions(renditions, dimensions[0])
    largest = defaults[-1]
    sources = [
        {"src": item["src"], "type": item["type"], **(
            {"media": f"(max-width: {item['width']}px)"} if item["width"] < largest["width"] else {}
        )}
        for item in defaults
    ]
    default_posters = _default_renditions(posters, dimensions[0])
    poster = next(item for item in default_posters if item["width"] == largest["width"])
    return {
        "type": "video",
        "alt": alt,
        "poster": poster["src"],
        "poster_srcset": _srcset(default_posters),
        "poster_renditions": posters,
        "sources": sources,
        "renditions": renditions,
        "sizes": "",
        "width": largest["width"],
        "height": largest["height"],
    }


def placeholder_media(alt: str = "Bare Brilliant — natural diamond engagement ring") -> dict:
    return {
        "type": "image",
        "placeholder": True,
        "alt": alt,
        "src": settings.PLACEHOLDER_NAME,
        "srcset": "",
        "sizes": "",
    }
