"""Force-regenerate every derived rendition from the raw originals.

For each product it wipes products_media/<id>/ and re-encodes every IMG_SRCSET
rung, every VIDEO_SRCSET mp4 + webm, and the poster straight from
products_raw_media/ (the uploaded ProductImage / ProductVideo files), then
rewrites the product JSON + catalog.

Use after changing IMG_SRCSET / IMAGE_QUALITY / IMAGE_FORMAT / VIDEO_SRCSET /
VIDEO_FORMATS / VIDEO_*_CRF — a plain `refresh_inventory` keeps existing rungs.

    python manage.py rebuild_media                     # all published products
    python manage.py rebuild_media --all               # + unpublished ones too
    python manage.py rebuild_media the-aria the-lumen  # just these ids
"""

from django.core.management.base import BaseCommand, CommandError

from inventory import publisher


class Command(BaseCommand):
    help = "Wipe and rebuild all image/video renditions from the raw originals, then rewrite JSON."

    def add_arguments(self, parser):
        parser.add_argument("product_ids", nargs="*", help="Limit to these product ids (default: all published).")
        parser.add_argument("--all", action="store_true", dest="include_unpublished",
                            help="Also rebuild media for unpublished products.")

    def handle(self, *args, **opts):
        slugs = opts["product_ids"] or None
        try:
            run = publisher.run_job(
                "rebuild", slugs=slugs, include_unpublished=opts["include_unpublished"],
                log=lambda m="": self.stdout.write(str(m)),
            )
        except ValueError as exc:
            raise CommandError(str(exc))
        self.stdout.write(self.style.SUCCESS(f"rebuild {run.status}: {run.summary}"))
