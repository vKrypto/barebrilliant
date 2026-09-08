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
.github/workflows/     deploy.yml — builds storefront/ to GitHub Pages
server_docs/           reference event tracker + the /add-events wire format
raw_plans/             brand narrative, design guide, and the Final website spec
dashboard/             (later) Django CRM that reads the events
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

**Later** — fill in the stub pages; build the `dashboard/` Django CRM.

## Run

```bash
cd storefront
yarn install
yarn dev             # http://localhost:8080
```

## Deploy

Push to `main`. `.github/workflows/deploy.yml` builds `storefront/` and
publishes to GitHub Pages at `https://vkrypto.github.io/barebrilliant/`
(the workflow sets `VITE_BASE=/barebrilliant/` automatically). Repo variables:
`VITE_LAMBDA_URL` (events endpoint — until set, events queue locally),
optional `VITE_TENANT_NAME`, `VITE_CATALOG_BASE`, `VITE_MEDIA_BASE`.
