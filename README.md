# barebrilliant

Minimal-backend e-commerce build. The frontend is a static React app; the only
thing it talks to is a **Lambda function URL** that ingests tracked events
(`lead_generated`, `lead_submitted`, `order_placed`, `page_visit`, `scroll`,
`href_click`, `banner_click`, …). There is no server in this repo.

```
storefront/            React + Vite. /chat + shared header/footer + /thank-you.
.github/workflows/     deploy.yml — builds storefront/ to GitHub Pages
server_docs/           reference tracker (server.js + service-worker.js) + the
                       /add-events wire format the storefront implements
raw_plans/             the brief + the Bare Brilliant design guide
dashboard/             (later) Django CRM that reads the events
```

## storefront

See [storefront/README.md](storefront/README.md) for the full rundown. In short:

- **`/chat`** — the lead form, frontend copied from the Bare Brilliant reference
  app, restyled to the design guide (`raw_plans/design_language_guide.pdf`).
  Submitting pushes a `lead_submitted` event and redirects to **`/thank-you`**.
- **Header / Footer** — shared shell; more pages slot in later.
- **Events, two ways** (same `/add-events` wire format as `server_docs/`):
  - deferred — `trackEvent(...)` writes to IndexedDB, the service worker
    batches and flushes to `${VITE_LAMBDA_URL}/add-events`;
  - immediate — `sendEventNow(...)` (alias `send_event_now`) PUTs now and
    returns the response, for when a call needs the answer or a guaranteed flush.
  With `VITE_LAMBDA_URL` unset, events just accumulate in IndexedDB and flush
  once it is set.
- **Cache-bust on deploy** — every GitHub Actions run bakes a fresh
  `SW_VERSION` (the "sw-version" build number) into the service worker. The
  browser reinstalls it, and its `activate` wipes all caches and reloads open
  tabs once, so a changed bundle or a changed `VITE_LAMBDA_URL` always reaches
  clients.

### Run

```bash
cd storefront
yarn install
yarn dev             # http://localhost:8080
```

Yarn (classic) is the package manager — `storefront/yarn.lock` is committed and
CI uses it. Config generation is chained into the `dev` / `build` scripts, so
npm/pnpm/bun also work if you'd rather (just don't commit their lockfiles).

### Deploy

Push to `main` (this folder is the git repo). `.github/workflows/deploy.yml`
builds `storefront/` and publishes to GitHub Pages. Set repo variables:

| Variable | Purpose |
| --- | --- |
| `VITE_LAMBDA_URL` | events endpoint (Lambda function URL), no trailing slash |
| `VITE_TENANT_NAME` | optional; `tenant_name` header value, defaults to the repo name |
| `VITE_BASE` | optional; `/` for a user/org site or custom domain (default is `/<repo>/`) |

## dashboard

Django CRM that reads the event stream — **not built yet**, planned as a later
step.
