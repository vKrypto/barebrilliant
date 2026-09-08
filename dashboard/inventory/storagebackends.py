"""The publish destination — local disk or S3, chosen by ``EXPORT_BACKEND``.

Everything the publisher writes (catalog.json, products/<slug>.json,
products_media/*, the placeholder) goes through :func:`export_storage`, so the
same code path serves a dev checkout and a production S3 + CDN bucket.
"""

import functools
import mimetypes
import shutil
from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage

mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("video/webm", ".webm")


class _OverwriteFSStorage(FileSystemStorage):
    """FileSystemStorage that overwrites instead of suffixing a new name."""

    def get_available_name(self, name, max_length=None):
        self.delete(name)
        return name


@functools.lru_cache(maxsize=1)
def export_storage():
    if settings.EXPORT_BACKEND == "s3":
        from storages.backends.s3 import S3Storage

        if not settings.AWS_STORAGE_BUCKET_NAME:
            raise RuntimeError(
                "EXPORT_BACKEND=s3 but AWS_STORAGE_BUCKET_NAME is unset — check dashboard/.env"
            )
        return S3Storage()  # reads AWS_* from settings

    root = settings.EXPORT_LOCAL_ROOT
    root.mkdir(parents=True, exist_ok=True)
    return _OverwriteFSStorage(location=str(root))


def save_bytes(rel_path: str, data: bytes) -> str:
    storage = export_storage()
    storage.save(rel_path, ContentFile(data))
    return rel_path


def save_text(rel_path: str, text: str) -> str:
    return save_bytes(rel_path, text.encode("utf-8"))


def exists(rel_path: str) -> bool:
    return export_storage().exists(rel_path)


def delete(rel_path: str) -> bool:
    storage = export_storage()
    if storage.exists(rel_path):
        storage.delete(rel_path)
        return True
    return False


def listdir(rel_path: str):
    """(dirs, files) under rel_path; ([], []) if it doesn't exist."""
    storage = export_storage()
    try:
        return storage.listdir(rel_path)
    except (FileNotFoundError, OSError):
        return [], []


def rmtree(rel_path: str) -> int:
    """Remove rel_path and everything under it. Returns the file count removed."""
    storage = export_storage()
    if isinstance(storage, FileSystemStorage):
        target = Path(storage.location) / rel_path
        if not target.exists():
            return 0
        n = sum(1 for p in target.rglob("*") if p.is_file())
        shutil.rmtree(target, ignore_errors=True)
        return n
    # S3 / other: our media dirs are flat, so a listdir + delete is enough.
    _dirs, files = listdir(rel_path)
    return sum(1 for f in files if delete(f"{rel_path}/{f}"))


def url(rel_path: str) -> str:
    return export_storage().url(rel_path)


def describe() -> str:
    if settings.EXPORT_BACKEND == "s3":
        loc = f"s3://{settings.AWS_STORAGE_BUCKET_NAME}/{settings.AWS_LOCATION}".rstrip("/")
        return loc
    return str(settings.EXPORT_LOCAL_ROOT)
