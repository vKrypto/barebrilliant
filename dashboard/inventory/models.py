"""Inventory data model.

One SQLite row per product. First-class columns cover what staff edit day to day
and what the catalog facets need; everything else in the storefront's rich PDP
payload rides along in ``Product.pdp_extra`` (a JSON blob), seeded from the
existing sample product JSON by ``manage.py import_samples``.
"""

import os
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import get_valid_filename
from taggit.managers import TaggableManager

SHAPE_CHOICES = [(s, s) for s in settings.SHAPES]
STYLE_CHOICES = [(s, s) for s in settings.STYLES]


def _raw_media_path(instance, filename):
    """Uploaded originals -> media/products_raw_media/<product id>/<filename>,
    mirroring the deployed storage/ layout."""
    pid = getattr(instance.product, "slug", None) or "_unassigned"
    return f"{settings.RAW_MEDIA_DIR}/{pid}/{get_valid_filename(filename)}"


class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    slug = models.SlugField(
        "Product ID",
        max_length=140, unique=True,
        help_text="Stable public id (e.g. 'the-aria'). The storefront takes this "
                  "token from its URL and fetches products/<id>.json; it also names "
                  "every generated media folder. Set once — don't change after publishing.",
    )
    name = models.CharField(max_length=200)
    descriptor = models.CharField(
        max_length=200, blank=True,
        help_text="Short catalog-card tagline, e.g. 'Cathedral oval solitaire'.",
    )
    subtitle = models.CharField(
        max_length=200, blank=True,
        help_text="PDP subtitle, e.g. 'Oval Natural Diamond Engagement Ring'.",
    )
    description = models.TextField(
        blank=True, help_text="PDP 'About the ring' prose.",
    )

    price_from = models.PositiveIntegerField(default=0, help_text="Whole rupees.")

    shape = models.CharField(max_length=40, choices=SHAPE_CHOICES, blank=True)
    style = models.CharField(max_length=40, choices=STYLE_CHOICES, blank=True)
    centre_carat_shown = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True,
        help_text="Drives the catalog 'centre carat' facet.",
    )

    category = models.ForeignKey(
        Category, null=True, blank=True, on_delete=models.SET_NULL, related_name="products",
    )
    tags = TaggableManager(blank=True)

    is_published = models.BooleanField(
        default=False,
        help_text="Unpublished products are excluded from catalog.json and have "
                  "no product JSON on storage.",
    )
    sort_weight = models.IntegerField(
        default=0, help_text="Higher sorts first under the 'recommended' order.",
    )

    pdp_extra = models.JSONField(
        default=dict, blank=True,
        help_text="Extra PDP payload merged verbatim into products/<slug>.json "
                  "(price_breakup, specifications, trust_line, metals, related, …).",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_published_at = models.DateTimeField(null=True, blank=True, editable=False)

    class Meta:
        ordering = ["-sort_weight", "name"]

    def __str__(self):
        return self.name

    @property
    def is_dirty(self) -> bool:
        """True when the DB row has changed since it was last pushed to storage."""
        return self.last_published_at is None or self.updated_at > self.last_published_at

    def mark_published(self, when=None):
        when = when or timezone.now()
        # .update() bypasses auto_now so updated_at == last_published_at exactly
        # and is_dirty flips to False.
        Product.objects.filter(pk=self.pk).update(last_published_at=when, updated_at=when)
        self.last_published_at = self.updated_at = when


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to=_raw_media_path)
    alt = models.CharField(max_length=250, blank=True)
    order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        # filename, not "#<order>" — the label sits on the drag handle and must
        # not look stale after a reorder-before-save.
        return f"{self.product.slug} · {os.path.basename(self.image.name) or 'image'}"


class ProductVideo(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="videos")
    video = models.FileField(upload_to=_raw_media_path)
    alt = models.CharField(max_length=250, blank=True)
    order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.product.slug} · {os.path.basename(self.video.name) or 'video'}"


class DeletedProduct(models.Model):
    """Work queue: a product slug whose storage files still need to be removed.

    Written by a pre_delete signal (and by the unpublish action). Drained and
    cleared by the next publish / refresh run.
    """

    slug = models.CharField(max_length=140)
    was_published = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.slug


class PublishRun(models.Model):
    KIND_CHOICES = [("refresh", "Refresh complete inventory"), ("publish", "Publish inventory changes")]
    STATUS_CHOICES = [("running", "running"), ("ok", "ok"), ("error", "error")]

    kind = models.CharField(max_length=12, choices=KIND_CHOICES)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="running")
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    summary = models.TextField(blank=True)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.get_kind_display()} — {self.status} ({self.started_at:%Y-%m-%d %H:%M})"

    @classmethod
    def is_running(cls) -> bool:
        cutoff = timezone.now() - timedelta(minutes=30)  # ignore stale/crashed runs
        return cls.objects.filter(status="running", started_at__gte=cutoff).exists()
