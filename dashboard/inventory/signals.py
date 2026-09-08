"""Keep ``Product.updated_at`` honest, queue deletions, and tidy uploaded files.

- Editing / adding / removing a child image or video row must mark the parent
  product dirty, otherwise "Publish inventory changes" would skip a product whose
  only change was its media.
- Deleting a Product records its id in DeletedProduct so the next publish run
  removes its generated files from storage, and drops the uploaded originals
  under media/products_raw_media/<id>/ right away.
"""

import shutil
from pathlib import Path

from django.conf import settings
from django.db.models.signals import post_delete, post_save, pre_delete
from django.dispatch import receiver
from django.utils import timezone

from .models import DeletedProduct, Product, ProductImage, ProductVideo


def _touch_product(product_id):
    if product_id:
        Product.objects.filter(pk=product_id).update(updated_at=timezone.now())


@receiver([post_save, post_delete], sender=ProductImage)
def _image_changed(sender, instance, signal, **kwargs):
    _touch_product(instance.product_id)
    if signal is post_delete:
        _delete_file(instance.image)


@receiver([post_save, post_delete], sender=ProductVideo)
def _video_changed(sender, instance, signal, **kwargs):
    _touch_product(instance.product_id)
    if signal is post_delete:
        _delete_file(instance.video)


@receiver(pre_delete, sender=Product)
def _product_deleted(sender, instance, **kwargs):
    DeletedProduct.objects.get_or_create(
        slug=instance.slug,
        defaults={"was_published": instance.is_published},
    )


@receiver(post_delete, sender=Product)
def _product_raw_media_removed(sender, instance, **kwargs):
    raw = Path(settings.MEDIA_ROOT) / settings.RAW_MEDIA_DIR / instance.slug
    shutil.rmtree(raw, ignore_errors=True)


def _delete_file(filefield):
    try:
        if filefield and filefield.name:
            filefield.storage.delete(filefield.name)
    except Exception:  # noqa: BLE001 — best-effort cleanup
        pass
