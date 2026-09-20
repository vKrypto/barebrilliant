"""Populate every thumbnail and video rendition from the uploaded originals.

Does synchronously, from the CLI, what the media worker does after an upload —
reading the originals from default storage (MEDIA_ROOT/products_raw_media/…) and
the ladders from settings.py:

- admin thumbnail + one cover-crop per IMG_SRCSET rung   (default storage)
- an image rendition per IMG_SRCSET rung                  (export storage)
- mp4/webm renditions per VIDEO_SRCSET rung + posters     (export storage)

By default it only creates what is missing or out of date for the current
settings (file names carry the original's bytes + encoding config, so unchanged
files are reused). --force re-encodes everything in place, then removes stale
leftovers from the product's media folder once every rendition has succeeded.

    python manage.py populate_thumbnails                  # published products
    python manage.py populate_thumbnails --force          # recreate everything
    python manage.py populate_thumbnails the-aria --all   # given ids (+ unpublished)

Product JSON is not rewritten; run refresh_inventory afterwards if file names changed.
"""

import contextlib
import io
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from inventory import publisher, storagebackends
from inventory.image_cache import warm_image_cache
from inventory.models import Product


def _files(slug):
    return set(storagebackends.listdir(f"{settings.MEDIA_DIR}/{slug}")[1])


def _prune_stale(slug, images, videos):
    """Delete files in the product's media folder that no current rendition uses."""
    keep = {
        Path(item["src"]).name
        for media in (*images, *videos)
        for item in (*media["renditions"], *media.get("poster_renditions", []))
    }
    return sum(
        1 for name in _files(slug) - keep
        if storagebackends.delete(f"{settings.MEDIA_DIR}/{slug}/{name}")
    )


class Command(BaseCommand):
    help = "Create (or with --force, recreate) every thumbnail, image and video rendition from the originals."

    def add_arguments(self, parser):
        parser.add_argument("product_ids", nargs="*", help="Limit to these product ids (default: all published).")
        parser.add_argument("--all", action="store_true", dest="include_unpublished",
                            help="Also process unpublished products.")
        parser.add_argument("--force", action="store_true",
                            help="Re-encode everything even if it already exists, then remove stale files.")

    def handle(self, *args, **opts):
        force = opts["force"]
        products = self._targets(opts["product_ids"], opts["include_unpublished"])
        totals = dict(images=0, videos=0, created=0, removed=0)
        failed = []

        for product in products:
            slug = product.slug
            Product.objects.filter(pk=product.pk).update(media_status="running", media_error="")
            before = _files(slug)
            try:
                for row in product.images.all():
                    if force:
                        row.thumbnail_signature = ""  # invalidates the VersatileImageField crops + admin preview
                    with contextlib.redirect_stdout(io.StringIO()):  # VersatileImageField prints every file it deletes
                        warm_image_cache(row)
                images, videos = publisher._render_media(product, force=force)
                if force:
                    _prune_stale(slug, images, videos)
            except Exception as exc:  # noqa: BLE001 — record it and keep going with the other products
                message = f"{type(exc).__name__}: {exc}"
                Product.objects.filter(pk=product.pk).update(media_status="error", media_error=message)
                failed.append(slug)
                self.stderr.write(self.style.ERROR(f"  ✗ {slug}: {message}"))
                continue

            # .update() bypasses auto_now, so populating never marks the product as unpublished changes.
            Product.objects.filter(pk=product.pk).update(
                media_status="ready", media_ready_at=timezone.now(), media_error="",
            )
            after = _files(slug)
            totals["images"] += len(images)
            totals["videos"] += len(videos)
            totals["created"] += len(after - before)
            totals["removed"] += len(before - after)
            self.stdout.write(
                f"  · {slug}: {len(images)} image(s), {len(videos)} video(s) — {len(after)} renditions "
                f"(+{len(after - before)} new, -{len(before - after)} stale)"
            )

        summary = (
            f"{len(products) - len(failed)}/{len(products)} product(s): {totals['images']} image(s), "
            f"{totals['videos']} video(s), {totals['created']} new file(s), {totals['removed']} stale file(s) removed"
        )
        if failed:
            raise CommandError(f"populate failed for {', '.join(failed)} — {summary}")
        self.stdout.write(self.style.SUCCESS(f"populate ok: {summary}"))
        if totals["created"] or totals["removed"]:
            self.stdout.write(
                "If settings or originals changed, run `manage.py refresh_inventory` "
                "so the storefront JSON points at the new file names."
            )

    @staticmethod
    def _targets(slugs, include_unpublished):
        if slugs:
            unknown = sorted(set(slugs) - set(Product.objects.values_list("slug", flat=True)))
            if unknown:
                raise CommandError(f"unknown product id(s): {', '.join(unknown)}")
        targets = Product.objects.prefetch_related("images", "videos").order_by("slug")
        if slugs:
            targets = targets.filter(slug__in=slugs)
        elif not include_unpublished:
            targets = targets.filter(is_published=True)
        return list(targets)
