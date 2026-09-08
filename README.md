# barebrilliant

Minimal-backend e-commerce for **Bare Brilliant**, a natural-diamond
engagement-ring house. The storefront is a static React app; there is **no
server and no login** (deliberately, to keep hosting cost at zero). It reaches
the outside world only through:

- **Events** → a configurable **Lambda function URL** (`/add-events`, the
  contract in `server_docs/`), via IndexedDB + a service worker, with
  `send_event_now()` for the immediate path.
- **Static storage** → catalog + product JSON (`VITE_CATALOG_BASE`) and product
  media (`VITE_MEDIA_BASE`), fetched at runtime; both default to the bundled
  `storefront/public/storage/`. Search / filter / sort run client-side. Cart and
  wishlist live in `localStorage`.

The storefront is an installable **PWA** (manifest + Bare Brilliant icons +
app-shell service worker with an offline fallback).

```
storefront/            React + Vite storefront (see storefront/README.md)
dashboard/             Django-admin inventory manager (see dashboard/README.md)
.github/workflows/     deploy.yml — builds storefront/ to GitHub Pages
server_docs/           reference event tracker + the /add-events wire format
raw_plans/             brand narrative, design guide, and the Final website spec
```

## Design & content sources (`raw_plans/`)

- **`BARE BRILLIANT WEBSITE.pdf`** — *Final Website Design, Content & Developer
  Specification*. The authoritative source for routes, copy, CTAs and the
  design system. Supersedes the April `design_language_guide.pdf`.
- **`Bare Brilliant Brand Narrative`** (`.html` / `.pdf`, same content) — the
  house book: belief, product architecture, voice, exact colour hexes.

**Design system**: Playfair Display + Inter · dark-first (black / ivory / grey)
with warm gold `#B79A72` as a hairline accent only · type scale and tokens in
`storefront/src/theme.css`.

## What's built

**Phase 1** — `/chat` conversation gateway, shared header/footer, event
pipeline (IndexedDB + service worker + `send_event_now`), SW-version cache-bust,
GitHub Pages deploy workflow.

**Phase 2** — the shopping flow: homepage, catalog, product detail, wishlist,
cart, checkout (phone + email only, no payment), order confirmation. Every
other spec route (`/the-vow`, `/why-natural`, `/faqs`, all policy pages, …) is a
themed stub with real copy and CTAs so navigation never dead-ends.

**Phase 3** — `dashboard/`: a Django-admin **inventory manager** (SQLite, no
login). Staff edit products and it regenerates the storefront's static storage
tree — `catalog.json` + `products/<id>.json` + responsive `webp` image ladders
and `mp4`/`webm` video renditions — writing it to `dashboard/media/` locally or
straight to S3.

**Later** — fill in the stub pages.

## Run the storefront

```bash
cd storefront
yarn install
yarn dev             # http://localhost:8080
```

## Run the dashboard

```bash
cd dashboard
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt        # needs ffmpeg + ffprobe on PATH
.venv/bin/python manage.py migrate
.venv/bin/python manage.py import_samples        # seed products from a storage tree (--source PATH)
.venv/bin/python manage.py runserver 8001        # http://localhost:8001 → product list, no login
```

Regenerating the storage tree (the two buttons at the top of the product list
have CLI twins, handy for cron / CI):

```bash
.venv/bin/python manage.py refresh_inventory     # rebuild ALL published catalog + product JSON + media
.venv/bin/python manage.py publish_changes       # push only products changed since their last publish
.venv/bin/python manage.py rebuild_media          # force re-encode every rung from products_raw_media/
.venv/bin/python manage.py rebuild_media --all             #   … including unpublished products
.venv/bin/python manage.py rebuild_media the-aria the-lumen  #   … just these product ids
```

`refresh_inventory` / `publish_changes` keep existing rungs; run `rebuild_media`
after changing the `IMG_SRCSET` / `IMAGE_QUALITY` / `IMAGE_FORMAT` /
`VIDEO_SRCSET` / `VIDEO_FORMATS` / `VIDEO_*_CRF` settings. Full details:
[dashboard/README.md](dashboard/README.md).

## Docker

`docker-compose.yml` runs two nginx services:

| service | port | what |
| --- | --- | --- |
| `storage` | `${STORAGE_PORT:-8000}` | serves the dashboard's published tree `dashboard/media/` (catalog + product JSON + media) with permissive CORS; `products_raw_media/` (uploaded originals) is blocked |
| `storefront` | `${STOREFRONT_PORT:-8080}` | multi-stage: `yarn build` the Vite app, then nginx serves `dist/` (SPA fallback, immutable `/assets/`, no-cache SW) |

```bash
cp .env.example .env          # ports + VITE_* build args
cd dashboard && .venv/bin/python manage.py refresh_inventory && cd ..   # fill dashboard/media/
docker compose up --build     # storefront -> :8080, storage -> :8000
```

The `storage` service just bind-mounts `dashboard/media/`, so re-running
`refresh_inventory` / `publish_changes` (or hitting the dashboard buttons)
updates what it serves with no container restart.

`VITE_*` are **build args** (Vite inlines them) — change `.env` then
`docker compose build storefront`. `VITE_CATALOG_BASE` / `VITE_MEDIA_BASE`
point the browser at the host-published storage port, so if you change
`STORAGE_PORT` update them to match. Config: [docker/](docker/).

## Deploy

Push to `main`. `.github/workflows/deploy.yml` builds `storefront/` and
publishes to GitHub Pages at `https://vkrypto.github.io/barebrilliant/`
(the workflow sets `VITE_BASE=/barebrilliant/` automatically). Repo variables:
`VITE_LAMBDA_URL` (events endpoint — until set, events queue locally),
optional `VITE_TENANT_NAME`, `VITE_CATALOG_BASE`, `VITE_MEDIA_BASE`.
