# storefront

React + Vite. Static build, no server. Everything the app needs to tell the
outside world travels as **events** to a configurable endpoint (an AWS Lambda
Function URL). Ships today with the `/chat` lead page, a shared header/footer,
and `/thank-you`; more pages slot into `src/pages/` + `src/App.jsx` later.

## Run it

Package manager: **Yarn** (classic, 1.x — `yarn.lock` is committed).

```bash
cd storefront
cp .env.example .env      # optional; set VITE_LAMBDA_URL when the Lambda exists
yarn install
yarn dev                  # http://localhost:8080
yarn build                # -> dist/
```

`dev` and `build` both run `scripts/gen-build-config.mjs` first — it's chained
into the script string (not a `pre` hook), so npm/pnpm/bun work too if you
prefer; just don't commit their lockfiles.

## Events

Two paths, one wire format (`PUT {LAMBDA_URL}/add-events`, body `{ events: [...] }`,
headers `tenant_name` / `session_id` / `Idempotency-Key`) — the contract from
[`../server_docs/`](../server_docs).

| Need | Use | What happens |
| --- | --- | --- |
| Timing doesn't matter (`page_visit`, `scroll`, `click`, `href_click`, `banner_click`, `lead_generated`) | `trackEvent(...)` / the named `track*` helpers in `src/events/index.js` | Written to IndexedDB. `public/service-worker.js` batches up to 50 and flushes every 10s, with Background Sync as the backstop. |
| Need the response, or a guaranteed flush now (`lead_submitted`, `order_placed`) | `sendEventNow(...)` (alias `send_event_now`) in `src/events/sendEventNow.js` | `fetch` right now; resolves with the parsed response body. Throws if `VITE_LAMBDA_URL` is unset or the request fails — callers fall back to `trackEvent`. |

`flushNow()` messages the service worker to drain the queue immediately instead
of waiting for its 10s tick.

Auto-tracked without any call site: `page_visit` (per route, via
`components/RouteTracker.jsx`), `scroll` depth, every `click`, `href_click` on
any `<a href>`, and `banner_click` on any element carrying `data-banner="..."`.

Events fired from the CRM instead of here: `lead_approved`, `lead_rejected`,
`order_shipped`, `order_delivered`.

## Build config (`scripts/gen-build-config.mjs`)

Generates two git-ignored files from the environment on every `dev` / `build`:

- **`public/service-worker.js`** — `scripts/service-worker.template.js` with
  `__SW_VERSION__`, `__LAMBDA_URL__`, `__TENANT_NAME__`, `__BUILD_TIME__` filled in.
- **`src/generated/buildInfo.js`** — the same values as an ES module for
  `sendEventNow.js`.

Inputs: `SW_VERSION` (CI passes `gh-<run>-<sha>`; falls back to a dev
timestamp), `VITE_LAMBDA_URL`, `VITE_TENANT_NAME`.

### Why a new SW_VERSION every deploy

The service worker file's bytes change → the browser installs a new worker →
its `activate` **deletes every Cache Storage entry** and posts `SW_UPDATED` to
open tabs, which reload once (`src/events/swClient.js`). That is how a changed
bundle or a changed `VITE_LAMBDA_URL` reaches clients that already have the app
open. Combined with Vite's content-hashed asset filenames, nothing stale
survives a deploy.

## Deploy

`../.github/workflows/deploy.yml` runs `yarn install --frozen-lockfile && yarn
build` in this folder and publishes `dist/` to GitHub Pages on push to
`main`/`master`. It sets `SW_VERSION` from the run number and reads
`VITE_LAMBDA_URL` / `VITE_TENANT_NAME` from repo variables. `yarn build` also
writes `dist/404.html` (a copy of `index.html`) so deep links resolve on Pages.
