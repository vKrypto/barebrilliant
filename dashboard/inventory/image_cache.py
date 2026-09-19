"""Prewarm local image crops and admin previews from the media worker.

VersatileImageField retains the original image format. Storefront format
conversion and video rendering remain in ``media_pipeline``.
"""

import hashlib
import json
from urllib.parse import urlsplit, urlunsplit

from django.conf import settings
from versatileimagefield import settings as image_settings
from versatileimagefield.image_warmer import VersatileImageFieldWarmer


ADMIN_THUMBNAIL_SIZE = "300x300"


def _rendition_keys():
    """Resolve current settings, including non-square and same-width crops."""
    keys = []
    if not settings.IMG_SRCSET:
        raise ValueError("IMG_SRCSET must contain at least one (width, height) pair.")
    for size in settings.IMG_SRCSET:
        if (
            not isinstance(size, (tuple, list)) or len(size) != 2
            or any(type(value) is not int or value <= 0 for value in size)
        ):
            raise ValueError("IMG_SRCSET dimensions must be positive integers.")
        width, height = size
        keys.append((f"crop_{width}x{height}", f"crop__{width}x{height}"))
    keys.append(("admin", f"thumbnail__{ADMIN_THUMBNAIL_SIZE}"))
    return list(dict.fromkeys(keys))


def _signature(field_file, keys):
    """Detect changed bytes even when an original was overwritten in place."""
    config = {
        "version": 1,
        "source": field_file.name,
        "renditions": keys,
        "image_quality": settings.IMAGE_QUALITY,
        "image_format": settings.IMAGE_FORMAT,
        "versatile": {
            key: image_settings.VERSATILEIMAGEFIELD_SETTINGS[key]
            for key in (
                "jpeg_resize_quality", "webp_resize_quality", "lossless_webp",
                "progressive_jpeg", "sized_directory_name", "image_key_post_processor",
            )
        },
    }
    digest = hashlib.sha256(json.dumps(config, sort_keys=True).encode())
    with field_file.storage.open(field_file.name, "rb") as original:
        for chunk in iter(lambda: original.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _rendition(field_file, key):
    method, size = key.split("__")
    return getattr(field_file, method)[size]


def _preview_url(url, signature):
    """Version local previews while preserving storage URLs with signed queries."""
    parts = urlsplit(url)
    if parts.query:
        return url
    return urlunsplit(parts._replace(query=f"v={signature[:16]}"))


def delete_image_cache(field_file):
    """Delete derived images and their cache references; preserve the original."""
    if field_file and field_file.name:
        field_file.delete_all_created_images()


def warm_image_cache(row):
    """Create configured crops and publish a ready admin preview URL.

    Call only from background jobs. Database updates bypass save signals so
    warming does not enqueue itself or mark product details dirty again.
    """
    if not row.pk or not row.image:
        raise ValueError("A saved ProductImage with an original is required.")
    field_file = row.image
    field_file.create_on_demand = False
    keys = _rendition_keys()
    signature = _signature(field_file, keys)
    current = type(row)._default_manager.filter(pk=row.pk, image=field_file.name)
    if not current.exists():
        raise RuntimeError("Image was replaced or deleted before thumbnail generation.")

    if row.thumbnail_signature != signature:
        # Clear completion metadata before invalidating old files. A failed
        # warm must not leave a preview marked ready for the previous version.
        current.update(thumbnail_signature="", thumbnail_url="")
        row.thumbnail_signature = row.thumbnail_url = ""
        delete_image_cache(field_file)

    # VIF trusts cached existence flags. Repair missing files even if a stale
    # flag survived manual cleanup or a partial storage restore.
    for _, key in keys:
        rendition = _rendition(field_file, key)
        if not rendition.storage.exists(rendition.name):
            rendition.clear_cache()

    created, failures = VersatileImageFieldWarmer(
        instance_or_queryset=current,
        rendition_key_set=keys,
        image_attr="image",
    ).warm()
    if failures or created != len(keys):
        raise RuntimeError(
            f"Thumbnail generation failed for {field_file.name}: "
            f"{created}/{len(keys)} renditions ready."
        )

    thumbnail = field_file.thumbnail[ADMIN_THUMBNAIL_SIZE]
    url = _preview_url(thumbnail.url, signature)
    if not current.update(thumbnail_signature=signature, thumbnail_url=url):
        raise RuntimeError("Image was replaced or deleted during thumbnail generation.")
    row.thumbnail_signature = signature
    row.thumbnail_url = url
    return url
