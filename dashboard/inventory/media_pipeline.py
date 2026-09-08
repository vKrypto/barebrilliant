"""Turn an uploaded original into the responsive rungs the storefront serves.

Images  -> Pillow -> ``<order>_<hash6>_<w>x<h>.webp`` for every IMG_SRCSET rung.
Videos  -> ffmpeg -> ``<order>_<hash6>_<w>p.mp4`` (H.264/AAC) +
           ``<order>_<hash6>_<w>p.webm`` (AV1/Opus) for every VIDEO_SRCSET rung,
           plus a ``<order>_<hash6>_poster_<w>x<h>.webp`` first frame.

All rungs for one product live under ``products_media/<slug>/`` so removing a
product is a directory wipe. ``hash6`` is sha1(original bytes)[:6]: re-exporting
is a no-op, and replacing a photo changes every rung's URL (CDN cache-bust).
Each function returns a media dict ready for the storefront JSON; ``sizes`` is
filled in by the publisher per placement.
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

MEDIA_DIR = settings.MEDIA_DIR


# --------------------------------------------------------------------- utils ---

def _read_bytes(field_file) -> bytes:
    field_file.open("rb")
    try:
        return field_file.read()
    finally:
        field_file.close()


def hash6(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()[:6]


def _srcset(entries: list[tuple[str, int]]) -> str:
    return ", ".join(f"{path} {w}w" for path, w in entries)


def _cover_webp(img: Image.Image, size: tuple[int, int]) -> bytes:
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
    fitted = ImageOps.fit(img, size, method=Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    fitted.save(buf, format="WEBP", quality=settings.IMAGE_QUALITY, method=6)
    return buf.getvalue()


def _run(cmd: list[str]) -> subprocess.CompletedProcess:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        tail = (proc.stderr or "").strip().splitlines()[-8:]
        raise RuntimeError(f"{Path(cmd[0]).name} failed ({proc.returncode}):\n" + "\n".join(tail))
    return proc


# -------------------------------------------------------------------- images ---

def render_image(field_file, order: int, alt: str, slug: str) -> dict:
    raw = _read_bytes(field_file)
    h6 = hash6(raw)
    base = f"{MEDIA_DIR}/{slug}"

    rungs: list[tuple[str, int]] = []
    missing: list[tuple[str, tuple[int, int]]] = []
    for (w, h) in settings.IMG_SRCSET:
        rel = f"{base}/{order}_{h6}_{w}x{h}.webp"
        rungs.append((rel, w))
        if not storagebackends.exists(rel):
            missing.append((rel, (w, h)))

    if missing:
        img = Image.open(io.BytesIO(raw))
        img.load()
        for rel, size in missing:
            storagebackends.save_bytes(rel, _cover_webp(img, size))

    lw, lh = settings.IMG_SRCSET[-1]
    return {
        "type": "image",
        "alt": alt,
        "src": rungs[len(rungs) // 2][0],
        "srcset": _srcset(rungs),
        "sizes": "",
        "width": lw,
        "height": lh,
    }


# -------------------------------------------------------------------- videos ---

def _probe_dimensions(path: str) -> tuple[int, int]:
    proc = _run([
        settings.FFPROBE_BIN, "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height", "-of", "json", path,
    ])
    stream = json.loads(proc.stdout)["streams"][0]
    return int(stream["width"]), int(stream["height"])


def _even(n: int) -> int:
    n = int(round(n))
    return max(2, n - (n % 2))


def render_video(field_file, order: int, alt: str, slug: str) -> dict:
    raw = _read_bytes(field_file)
    h6 = hash6(raw)
    base = f"{MEDIA_DIR}/{slug}"

    with tempfile.TemporaryDirectory(prefix="bb_vid_") as tmp:
        src = Path(tmp) / f"src_{h6}"
        src.write_bytes(raw)
        src_w, src_h = _probe_dimensions(str(src))
        aspect = (src_h / src_w) if src_w else 1.0

        widths = sorted({w for (w, _h) in settings.VIDEO_SRCSET if w <= src_w} or {src_w})
        webm_sources: list[dict] = []
        mp4_sources: list[dict] = []
        poster_rel = None

        for i, w in enumerate(widths):
            rw, rh = _even(w), _even(w * aspect)
            is_largest = i == len(widths) - 1
            mq = {} if is_largest else {"media": f"(max-width: {w}px)"}

            if "webm" in settings.VIDEO_FORMATS:
                rel = f"{base}/{order}_{h6}_{w}p.webm"
                if not storagebackends.exists(rel):
                    out = Path(tmp) / f"{w}.webm"
                    _run([
                        settings.FFMPEG_BIN, "-y", "-i", str(src), "-vf", f"scale={rw}:{rh}",
                        "-c:v", "libsvtav1", "-crf", str(settings.VIDEO_AV1_CRF),
                        "-preset", str(settings.VIDEO_AV1_PRESET),
                        "-c:a", "libopus", "-b:a", "128k", str(out),
                    ])
                    storagebackends.save_bytes(rel, out.read_bytes())
                webm_sources.append({"src": rel, "type": "video/webm", **mq})

            if "mp4" in settings.VIDEO_FORMATS:
                rel = f"{base}/{order}_{h6}_{w}p.mp4"
                if not storagebackends.exists(rel):
                    out = Path(tmp) / f"{w}.mp4"
                    _run([
                        settings.FFMPEG_BIN, "-y", "-i", str(src), "-vf", f"scale={rw}:{rh}",
                        "-c:v", "libx264", "-crf", str(settings.VIDEO_H264_CRF), "-preset", "medium",
                        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
                        "-movflags", "+faststart", str(out),
                    ])
                    storagebackends.save_bytes(rel, out.read_bytes())
                mp4_sources.append({"src": rel, "type": "video/mp4", **mq})

            if is_largest:
                poster_rel = f"{base}/{order}_{h6}_poster_{rw}x{rh}.webp"
                if not storagebackends.exists(poster_rel):
                    frame = Path(tmp) / "poster.png"
                    _run([
                        settings.FFMPEG_BIN, "-y", "-ss", "0", "-i", str(src),
                        "-frames:v", "1", "-vf", f"scale={rw}:{rh}", str(frame),
                    ])
                    storagebackends.save_bytes(poster_rel, _cover_webp(Image.open(frame), (rw, rh)))

        # Interleave per rung: webm before its mp4 sibling so AV1 wins when supported.
        sources: list[dict] = []
        for i in range(max(len(webm_sources), len(mp4_sources))):
            if i < len(webm_sources):
                sources.append(webm_sources[i])
            if i < len(mp4_sources):
                sources.append(mp4_sources[i])

        lw = _even(widths[-1])
        return {
            "type": "video",
            "alt": alt,
            "poster": poster_rel,
            "sources": sources,
            "sizes": "",
            "width": lw,
            "height": _even(lw * aspect),
        }


# --------------------------------------------------------------- placeholder ---

def placeholder_media(alt: str = "Bare Brilliant — natural diamond engagement ring") -> dict:
    return {
        "type": "image",
        "placeholder": True,
        "alt": alt,
        "src": settings.PLACEHOLDER_NAME,
        "srcset": "",
        "sizes": "",
    }
