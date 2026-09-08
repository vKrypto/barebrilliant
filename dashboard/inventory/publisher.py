"""Generate the storefront's static storage tree from the database.

Two entry points, wired to the two changelist buttons and to management commands:

- :func:`refresh_all`     — rebuild everything for every published product.
- :func:`publish_changes` — push only products changed since their last publish,
                            plus pending removals; always rewrites catalog.json.

Output layout (relative to the export root — local dir or S3 bucket):

    catalog/catalog.json
    products/<slug>.json
    products_media/<slug>/<order>_<hash6>_<w>x<h>.webp   (+ mp4/webm/poster)
    product_placeholder.webp
"""

from __future__ import annotations

import json
from datetime import datetime, timezone as _tz

from django.conf import settings
from django.utils import timezone

from . import media_pipeline, storagebackends
from .models import DeletedProduct, Product, PublishRun

CATALOG_PATH = settings.CATALOG_JSON_PATH
PRODUCT_DIR = settings.PRODUCT_JSON_DIR
MEDIA_DIR = settings.MEDIA_DIR
PLACEHOLDER = settings.PLACEHOLDER_NAME

_JSON_KW = dict(indent=2, ensure_ascii=False, sort_keys=False)


# ---------------------------------------------------------------- media/JSON ---

def _render_media(product) -> tuple[list[dict], list[dict]]:
    # `i` is the gallery position (rows come back in drag order), used as the
    # file-name prefix so it's always 0,1,2,… regardless of the stored `order`.
    images = [
        media_pipeline.render_image(row.image, i, row.alt or _auto_alt(product, i), product.slug)
        for i, row in enumerate(product.images.all())
    ]
    videos = [
        media_pipeline.render_video(row.video, i, row.alt or _auto_alt(product, i, "video"), product.slug)
        for i, row in enumerate(product.videos.all())
    ]
    return images, videos


def _auto_alt(product, i: int, kind: str = "image") -> str:
    shape = (product.shape or "").lower()
    lead = f"{product.name} — {shape} natural diamond engagement ring".replace("  ", " ")
    return f"{lead}, {kind} {i + 1}".strip()


def _sized(media: dict, sizes: str) -> dict:
    return {**media, "sizes": sizes}


def build_product_payload(product, images: list[dict], videos: list[dict]) -> dict:
    gallery = [_sized(m, settings.PDP_SIZES) for m in (images + videos)]
    if not gallery:
        gallery = [_sized(media_pipeline.placeholder_media(), settings.PDP_SIZES)]

    first_class = {
        "id": product.slug,
        "slug": product.slug,
        "name": product.name,
        "subtitle": product.subtitle,
        "descriptor": product.descriptor,
        "price_from": product.price_from,
        "currency": settings.CURRENCY,
        "shape": product.shape,
        "style": product.style,
        "about": product.description,
        "category": product.category.name if product.category_id else None,
        "tags": [t.name for t in product.tags.all()],
        "gallery": gallery,
    }
    # pdp_extra fills everything the storefront PDP still expects
    # (why_this_works, price_breakup, specifications, trust_line, metals, …);
    # first-class keys win.
    payload = {**(product.pdp_extra or {}), **first_class}
    payload.pop("_card", None)
    return payload


def build_card(product, images: list[dict], videos: list[dict]) -> dict:
    extra = product.pdp_extra or {}
    primary = images[0] if images else (videos[0] if videos else media_pipeline.placeholder_media())
    if videos:
        secondary = videos[0]
    elif len(images) > 1:
        secondary = images[1]
    else:
        secondary = None
    return {
        "id": product.slug,
        "slug": product.slug,
        "name": product.name,
        "descriptor": product.descriptor,
        "shape": product.shape,
        "style": product.style,
        "price_from": product.price_from,
        "centre_carat_shown": float(product.centre_carat_shown) if product.centre_carat_shown is not None else None,
        "metal_default": extra.get("metal_default", ""),
        "badges": extra.get("badges", ["Natural Diamond"]),
        "media": {
            "primary": _sized(primary, settings.CARD_SIZES),
            "secondary": _sized(secondary, settings.CARD_SIZES) if secondary else None,
        },
        "created_at": timezone.localtime(product.created_at).date().isoformat(),
        "sort_weight": product.sort_weight,
    }


def _write_product(product) -> dict:
    images, videos = _render_media(product)
    payload = build_product_payload(product, images, videos)
    storagebackends.save_text(f"{PRODUCT_DIR}/{product.slug}.json", json.dumps(payload, **_JSON_KW) + "\n")
    return build_card(product, images, videos)


def _delete_product_files(slug: str) -> int:
    removed = 1 if storagebackends.delete(f"{PRODUCT_DIR}/{slug}.json") else 0
    removed += storagebackends.rmtree(f"{MEDIA_DIR}/{slug}")
    return removed


def _write_catalog(cards: list[dict]) -> None:
    used_shape = {c["shape"] for c in cards if c["shape"]}
    used_style = {c["style"] for c in cards if c["style"]}
    catalog = {
        "generated_at": datetime.now(_tz.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "currency": settings.CURRENCY,
        "facets": {
            "shape": [s for s in settings.SHAPES if s in used_shape],
            "style": [s for s in settings.STYLES if s in used_style],
            "budget": settings.BUDGET_BANDS,
            "centre_carat": settings.CARAT_BANDS,
        },
        "sorts": settings.CATALOG_SORTS,
        "products": cards,
    }
    storagebackends.save_text(CATALOG_PATH, json.dumps(catalog, **_JSON_KW) + "\n")


def _ensure_placeholder() -> None:
    if storagebackends.exists(PLACEHOLDER):
        return
    bundled = settings.REPO_DIR / "storefront" / "public" / "storage" / PLACEHOLDER
    if bundled.is_file():
        storagebackends.save_bytes(PLACEHOLDER, bundled.read_bytes())
        return
    from PIL import Image

    img = Image.new("RGB", (1200, 1200), (17, 16, 15))
    import io

    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=settings.IMAGE_QUALITY)
    storagebackends.save_bytes(PLACEHOLDER, buf.getvalue())


def _ordered(qs):
    return qs.order_by("-sort_weight", "name")


# --------------------------------------------------------------- public API ----

def refresh_all(*, log=print) -> dict:
    """Rebuild the entire published catalog + media from scratch."""
    published = list(_ordered(Product.objects.filter(is_published=True)).prefetch_related("images", "videos", "tags"))
    cards = []
    for p in published:
        log(f"  · {p.slug}")
        cards.append(_write_product(p))

    removed = 0
    for p in Product.objects.filter(is_published=False):
        removed += _delete_product_files(p.slug)
    for d in DeletedProduct.objects.all():
        removed += _delete_product_files(d.slug)
    DeletedProduct.objects.all().delete()

    _ensure_placeholder()
    _write_catalog(cards)

    now = timezone.now()
    Product.objects.filter(is_published=True).update(last_published_at=now, updated_at=now)

    return {"published": len(cards), "removed_files": removed, "dest": storagebackends.describe()}


def rebuild_media(*, slugs=None, include_unpublished=False, log=print) -> dict:
    """Force-regenerate every derived rendition from the raw originals.

    Wipes ``products_media/<id>/`` for each target product and re-encodes every
    IMG_SRCSET / VIDEO_SRCSET rung + video renditions + poster from
    ``products_raw_media/`` (the ``ProductImage.image`` / ``ProductVideo.video``
    uploads), then rewrites the product JSON + catalog so the fresh
    src/srcset/dimensions propagate. Use after changing IMG_SRCSET,
    IMAGE_QUALITY, IMAGE_FORMAT, VIDEO_SRCSET, VIDEO_FORMATS or the CRF settings.
    """
    known = set(Product.objects.values_list("slug", flat=True))
    if slugs:
        unknown = sorted(set(slugs) - known)
        if unknown:
            raise ValueError(f"unknown product id(s): {', '.join(unknown)}")

    targets = Product.objects.prefetch_related("images", "videos", "tags")
    if slugs:
        targets = targets.filter(slug__in=slugs)
    elif not include_unpublished:
        targets = targets.filter(is_published=True)
    targets = list(_ordered(targets))

    wiped = images = videos = 0
    for p in targets:
        wiped += storagebackends.rmtree(f"{MEDIA_DIR}/{p.slug}")
        imgs, vids = _render_media(p)  # rungs gone -> full re-encode from raw
        images += len(imgs)
        videos += len(vids)
        log(f"  · {p.slug}: {len(imgs)} image set(s), {len(vids)} video(s)")

    # propagate the fresh media objects into the published JSON + catalog
    refreshed = refresh_all(log=lambda *_a, **_k: None)

    return {
        "products": len(targets),
        "image_sets": images,
        "videos": videos,
        "wiped_files": wiped,
        "published": refreshed["published"],
        "dest": storagebackends.describe(),
    }


def publish_changes(*, log=print) -> dict:
    """Push only dirty products + pending removals; always rewrite catalog.json."""
    published = list(_ordered(Product.objects.filter(is_published=True)).prefetch_related("images", "videos", "tags"))
    dirty = [p for p in published if p.is_dirty]
    now = timezone.now()

    cards: list[dict] = []
    for p in published:
        if p in dirty:
            log(f"  · {p.slug} (changed)")
            cards.append(_write_product(p))
            p.mark_published(now)
        else:
            images, videos = _render_media(p)  # rungs already on storage -> no re-encode
            cards.append(build_card(p, images, videos))

    removed = 0
    for p in Product.objects.filter(is_published=False):
        removed += _delete_product_files(p.slug)
    for d in DeletedProduct.objects.all():
        removed += _delete_product_files(d.slug)
    DeletedProduct.objects.all().delete()

    _ensure_placeholder()
    _write_catalog(cards)

    return {
        "published": len(dirty),
        "unchanged": len(published) - len(dirty),
        "removed_files": removed,
        "dest": storagebackends.describe(),
    }


# ------------------------------------------------------------- run bookkeeping --

_JOBS = {"refresh": refresh_all, "publish": publish_changes, "rebuild": rebuild_media}


def run_job(kind: str, *, log=print, **kwargs) -> PublishRun:
    """Wrap a publisher job in a PublishRun row."""
    run = PublishRun.objects.create(kind=kind)
    try:
        result = _JOBS[kind](log=log, **kwargs)
        run.status = "ok"
        run.summary = json.dumps(result)
    except Exception as exc:  # noqa: BLE001 — surface any failure in the row
        run.status = "error"
        run.summary = f"{type(exc).__name__}: {exc}"
        run.finished_at = timezone.now()
        run.save(update_fields=["status", "summary", "finished_at"])
        raise
    run.finished_at = timezone.now()
    run.save(update_fields=["status", "summary", "finished_at"])
    return run
