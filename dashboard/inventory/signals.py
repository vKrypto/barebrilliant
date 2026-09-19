"""Keep ``Product.updated_at`` honest, queue deletions, and tidy uploaded files.

- Editing / adding / removing a child image or video row must mark the parent
  product dirty, otherwise "Publish inventory changes" would skip a product whose
  only change was its media.
- Deleting a Product records its id in DeletedProduct so the next publish run
  removes its generated files from storage, and drops the uploaded originals
  under media/products_raw_media/<id>/ right away.
"""

import shutil
from functools import partial
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_delete, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import DeletedProduct, Product, ProductImage, ProductVideo


def _touch_product(product_id):
    if product_id:
        from .tasks import queue_product_media

        requested_at = timezone.now()
        updated = Product.objects.filter(pk=product_id).update(
            updated_at=requested_at, media_status="queued",
            media_requested_at=requested_at, media_error="",
        )
        if updated:
            queue_product_media(product_id, requested_at)


@receiver(pre_save, sender=ProductImage)
def _image_replaced(sender, instance, **kwargs):
    if not instance.pk:
        return
    previous = sender.objects.filter(pk=instance.pk).values_list("image", flat=True).first()
    if previous and (previous != instance.image.name or not instance.image._committed):
        from .tasks import remove_image_file

        instance.thumbnail_signature = ""
        instance.thumbnail_url = ""
        transaction.on_commit(partial(remove_image_file, previous))


@receiver([post_save, post_delete], sender=ProductImage)
def _image_changed(sender, instance, signal, **kwargs):
    _touch_product(instance.product_id)
    if signal is post_delete:
        from .tasks import remove_image_file

        transaction.on_commit(partial(remove_image_file, instance.image.name))


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
