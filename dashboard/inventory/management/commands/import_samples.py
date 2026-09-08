"""Seed the database from the committed sample storage tree.

Reads storefront/public/storage/{catalog/catalog.json, products/*.json} and
creates a Category + one Product per file, with the existing 1600² webp gallery
images copied in as uploaded originals. Everything not mapped to a first-class
column is stashed in Product.pdp_extra.

    python manage.py import_samples [--flush] [--source PATH]
"""

import datetime as dt
import json
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.utils.text import slugify

from inventory.models import Category, Product, ProductImage

FIRST_CLASS = {"id", "slug", "name", "subtitle", "about", "price_from", "currency", "shape", "style", "gallery"}


class Command(BaseCommand):
    help = "Import the sample products from storefront/public/storage into the database."

    def add_arguments(self, parser):
        parser.add_argument("--flush", action="store_true", help="Delete existing products/categories first.")
        parser.add_argument(
            "--source",
            default=str(settings.REPO_DIR / "storefront" / "public" / "storage"),
            help="Storage tree to read (default: the storefront's bundled copy).",
        )

    def handle(self, *args, **opts):
        src = Path(opts["source"])
        catalog_path = src / "catalog" / "catalog.json"
        products_dir = src / "products"
        if not catalog_path.is_file() or not products_dir.is_dir():
            raise CommandError(f"no catalog.json / products/ under {src}")

        if opts["flush"]:
            n, _ = Product.objects.all().delete()
            Category.objects.all().delete()
            self.stdout.write(f"flushed ({n} rows)")

        catalog = json.loads(catalog_path.read_text())
        cards = {c["id"]: c for c in catalog.get("products", [])}

        category, _ = Category.objects.get_or_create(
            slug="engagement-rings", defaults={"name": "Engagement Rings", "sort_order": 0}
        )

        created = skipped = 0
        for pfile in sorted(products_dir.glob("*.json")):
            data = json.loads(pfile.read_text())
            slug = data.get("slug") or data.get("id") or slugify(data["name"])
            card = cards.get(slug, {})

            if Product.objects.filter(slug=slug).exists() and not opts["flush"]:
                skipped += 1
                self.stdout.write(f"  = {slug} (exists, skipped)")
                continue

            pdp_extra = {k: v for k, v in data.items() if k not in FIRST_CLASS}
            pdp_extra.setdefault("badges", card.get("badges", ["Natural Diamond"]))

            product = Product.objects.create(
                slug=slug,
                name=data["name"],
                descriptor=card.get("descriptor", ""),
                subtitle=data.get("subtitle", ""),
                description=data.get("about", ""),
                price_from=data.get("price_from", 0),
                shape=data.get("shape", ""),
                style=data.get("style", ""),
                centre_carat_shown=card.get("centre_carat_shown"),
                category=category,
                is_published=True,
                sort_weight=card.get("sort_weight", 0),
                pdp_extra=pdp_extra,
            )
            tags = [t for t in (data.get("shape"), data.get("style")) if t]
            if tags:
                product.tags.add(*tags)

            # keep the sample's original "created_at" so the "newest" sort still
            # has spread (auto_now_add means we set it after create()).
            if card.get("created_at"):
                try:
                    naive = dt.datetime.fromisoformat(card["created_at"])
                    aware = timezone.make_aware(naive) if timezone.is_naive(naive) else naive
                    type(product).objects.filter(pk=product.pk).update(created_at=aware)
                except ValueError:
                    pass

            n_img = 0
            for ix, item in enumerate(data.get("gallery", [])):
                if item.get("type", "image") != "image":
                    continue
                media_file = src / item["src"]
                if not media_file.is_file():
                    self.stdout.write(self.style.WARNING(f"    ! missing {item['src']}"))
                    continue
                with media_file.open("rb") as fh:
                    row = ProductImage(product=product, alt=item.get("alt", ""), order=ix)
                    row.image.save(media_file.name, File(fh), save=True)
                n_img += 1

            created += 1
            self.stdout.write(self.style.SUCCESS(f"  + {slug} ({n_img} images)"))

        self.stdout.write(self.style.SUCCESS(f"done — {created} created, {skipped} skipped"))
