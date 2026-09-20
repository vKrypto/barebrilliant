"""Background media preparation and publishing, dispatched only after commit."""

from functools import partial

from django.db import transaction
from django.utils import timezone
from huey.contrib.djhuey import db_task

from . import publisher
from .models import Product, ProductImage, PublishRun


def queue_product_media(product_id, requested_at):
    transaction.on_commit(partial(prepare_product_media, product_id, requested_at.isoformat()))


@db_task(retries=2, retry_delay=30)
def prepare_product_media(product_id, requested_at):
    """Coalesce rapid edits and never mark an older revision as ready."""
    revision = Product.objects.filter(pk=product_id, media_requested_at=requested_at)
    if not revision.update(media_status="running", media_error=""):
        return  # Deleted product or superseded upload/reorder.

    product = revision.prefetch_related("images", "videos").first()
    if product is None:
        return
    try:
        images, _videos = publisher._render_media(product)
        publisher.save_previews(product, images)
    except Exception as exc:
        revision.update(media_status="error", media_error=f"{type(exc).__name__}: {exc}")
        raise
    revision.update(media_status="ready", media_ready_at=timezone.now(), media_error="")


def queue_publish(kind, **kwargs):
    if kind not in publisher._JOBS:
        raise ValueError(f"Unknown publish job: {kind}")
    run = PublishRun.objects.create(kind=kind, status="queued")

    def enqueue():
        try:
            publish_inventory(run.pk, kwargs)
        except Exception as exc:
            PublishRun.objects.filter(pk=run.pk).update(
                status="error", summary=f"Could not enqueue: {exc}", finished_at=timezone.now(),
            )
            raise

    transaction.on_commit(enqueue)
    return run


@db_task(retries=2, retry_delay=30)
def publish_inventory(run_id, options):
    run = PublishRun.objects.get(pk=run_id)
    publisher.run_job(run.kind, run=run, **options)


@db_task(retries=2, retry_delay=30)
def remove_image_file(name):
    """Remove a replaced/deleted original off-request."""
    if ProductImage.objects.filter(image=name).exists():
        return  # Another row still uses the file.
    ProductImage(image=name).image.storage.delete(name)
