# dashboard

Django-admin **inventory** manager for Bare Brilliant. Staff edit products in
SQLite; two buttons regenerate the storefront's static storage tree
(`catalog.json` + per-product JSON + responsive `webp` / `mp4` / `webm` media)
and push it to local disk or S3 + CDN. No login, no queue, no extra services —
the storefront stays a static, backend-less app; this is just the tool that
writes its data files.

## Run

```bash
cd dashboard
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt      # needs ffmpeg + ffprobe on PATH
.venv/bin/python manage.py migrate
.venv/bin/python manage.py import_samples       # seed from storefront/public/storage/
.venv/bin/python manage.py runserver 8001
```

Open <http://localhost:8001/> → it redirects straight to the product list (while
`DEBUG=True`, every request is auto-authenticated as a `staff` superuser —
`inventory/middleware.py`). Config: `cp .env.example .env`.

## What staff do

| Action | Effect |
| --- | --- |
| Edit a product, **Save** | SQLite only. The row is now "dirty" (shown in the list). |
| **Publish inventory changes** (top of list) | Push every dirty product's JSON + media, honour pending unpublish/delete, rewrite `catalog/catalog.json`. |
| **Refresh complete inventory** (top of list) | Rebuild *everything* published from scratch. Use after a schema change or to repair storage. |
| Bulk **Publish / Re-publish / Unpublish selected** | Same as above, scoped to the ticked rows (re-publish forces a re-push). |
| Delete a product | Row goes; its storage files are removed on the next publish/refresh. |

A product with **Published** unchecked is never written to storage and is absent
from `catalog.json`. A product with no images/videos publishes with the
placeholder.

## Model

`Product` carries the first-class fields (name, **Product ID** = the `slug`,
price, shape, style, category, tags, `is_published`, `sort_weight`) plus
`pdp_extra` — a JSON blob merged verbatim into `products/<id>.json` for the rest
of the storefront's PDP payload (`price_breakup`, `specifications`, `trust_line`,
`metals`, `related`, …). The **Product ID** is the token the storefront takes
from its URL and uses to fetch `products/<id>.json`; set it once and don't change
it after publishing.

**Adding media:** the *Add images* / *Add videos* fields on the change form take
**many files at once** (multi-select in the picker, or drop them on the field);
each becomes a gallery item appended after the current ones. `save_related` →
`ProductAdmin._save_bulk`.

**Reordering / removing:** `ProductImage` / `ProductVideo` are
`SortableStackedInline`s (django-admin-sortable2) — drag the ⠇ header, or use the
move-to-first / move-to-last arrows on each row. Gallery order = drag order; the
catalog card's primary/secondary come off positions 0 and 1. Ticking **DELETE?**
hides the row at once (with an *Undo*); it's actually removed on **Save**.
Uploaded originals never reach shoppers — only the generated renditions do.
(Handle / instant-delete / drop-zone polish:
`inventory/static/inventory/admin/media-inline.*`.)

## `dashboard/media/` — local mirror of `storage/`

Everything the dashboard touches lives here, laid out exactly like the deployed
`storage/` tree (all gitignored):

```
media/products_raw_media/<id>/…   uploaded originals (source for the pipeline)
media/products_media/<id>/…       generated <n>_<hash6>_<w>x<h>.webp + mp4/webm/poster
media/products/<id>.json          generated product payload
media/catalog/catalog.json        generated catalog
media/product_placeholder.webp
```

`EXPORT_BACKEND=s3` pushes the same tree to the bucket **except**
`products_raw_media/`. `EXPORT_LOCAL_ROOT` can instead point straight at
`../storefront/public/storage` to feed `yarn dev` with no copy step.

**`products_media/` is the only folder of generated images.** There is no separate
thumbnail cache: each image's admin preview is simply its smallest rendition in
`products_media/<id>/` (`ProductImage.thumbnail_url`, set by the media job). Previews
load from `/media/…`, so keep `EXPORT_LOCAL_ROOT` at its default (`MEDIA_ROOT`); with
`EXPORT_BACKEND=s3` set `AWS_S3_CUSTOM_DOMAIN` (host only) and `AWS_LOCATION` so the
preview URL resolves to your CDN.

## Media pipeline (`inventory/media_pipeline.py`)

- Images → Pillow → `products_media/<id>/<n>_<key>_<w>x<h>.webp` for every
  `IMG_SRCSET` rung (`settings.py`), quality `IMAGE_QUALITY`. `<n>` is the gallery
  position (drag order), always 0,1,2,… Rungs may have different aspect ratios;
  each is a centred cover-crop.
- Videos → ffmpeg → every `VIDEO_SRCSET` size × `VIDEO_FORMATS`:
  `<n>_<key>_<w>x<h>.mp4` (H.264/AAC) / `.webm` (AV1/Opus), plus a first-frame
  poster `<n>_<key>_poster_<w>x<h>.webp` per size.
- `key` = hash of the original's bytes **and** the encoding settings → re-exports
  are no-ops; replacing a photo or changing a ladder/quality gives fresh URLs (CDN
  cache-bust). Removing a product wipes its `products_media/<id>/` directory (and
  its `products_raw_media/<id>/` originals).

The `AWS_*` keys (see `.env.example`) drive the S3 backend: `django-storages`
writes the same keys to `AWS_STORAGE_BUCKET_NAME`; point `VITE_CATALOG_BASE` /
`VITE_MEDIA_BASE` (or a CDN in front of the bucket) at it.

The committed `storefront/public/storage/` sample tree is produced by the
storefront's own `yarn gen:catalog` and is also the seed `import_samples` reads —
treat it as fixtures, not dashboard output.

## CLI (cron / CI)

```bash
.venv/bin/python manage.py refresh_inventory     # = "Refresh complete inventory"
.venv/bin/python manage.py publish_changes       # = "Publish inventory changes"

# Force-regenerate EVERY rendition from the raw originals in products_raw_media/
# (refresh keeps existing rungs). Run after changing IMG_SRCSET / IMAGE_QUALITY /
# IMAGE_FORMAT / VIDEO_SRCSET / VIDEO_FORMATS / VIDEO_*_CRF.
.venv/bin/python manage.py rebuild_media                    # all published products
.venv/bin/python manage.py rebuild_media --all              # + unpublished ones
.venv/bin/python manage.py rebuild_media the-aria the-lumen # just these ids

# Populate every image/video rendition and the admin previews from the originals,
# in the foreground (what the media worker does after an upload). Creates whatever
# is missing / out of date for the current settings; --force re-encodes everything
# in place, then removes stale files. Also deletes a leftover media/__sized__ folder
# (the old thumbnail cache). Product JSON is not rewritten: run refresh_inventory
# afterwards if settings or originals changed.
.venv/bin/python manage.py populate_thumbnails              # all published products
.venv/bin/python manage.py populate_thumbnails --force      # recreate everything
.venv/bin/python manage.py populate_thumbnails the-aria --all   # these ids (+ unpublished)

.venv/bin/python manage.py test inventory
```
