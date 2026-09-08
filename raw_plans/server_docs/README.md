# Mini Event Tracker

Two files, no build step, no dependencies. Queues page/click/scroll (and
custom) events into IndexedDB from the main thread; a service worker batches
the queue and flushes it to your events API every 10s, with Background Sync
as a backstop when the tab closes before a flush.

This is a portable copy of the tracker used on `customer_facing/` — same
wire format and `/add-events` contract, genericized so it can be dropped
into any other site pointed at the same (or another) events API.

## Files

- `service-worker.js` — the only thing that talks to the network. Reads the
  IndexedDB queue, batches up to 50 events, `PUT`s them to
  `{API_BASE_URL}/add-events`, deletes what was sent.
- `server.js` — runs on every page. Writes events into IndexedDB, registers
  the service worker, and auto-tracks `page_visit`, `scroll`, `click`, and
  `href_click`. Never calls `fetch` itself.

## Install on a new site

1. Copy both files into a **dedicated subfolder**, not the domain root —
   this keeps the tracker's service worker out of the way of any other
   service worker the site already runs (a PWA install SW, a caching SW,
   etc.):

   ```
   your-site/
     mini-server/
       service-worker.js
     server.js
   ```

2. Edit the config block at the top of `service-worker.js`:

   ```js
   const SW_VERSION = 'v1';                              // bump on every edit to this file
   const API_BASE_URL = 'https://your-events-api...';    // no trailing slash
   const TENANT_NAME = 'your-site.com';                  // identifies this site to the backend
   ```

3. If you put `service-worker.js` somewhere other than `/mini-server/`,
   update `SERVICE_WORKER_PATH` and `SERVICE_WORKER_SCOPE` at the top of
   `server.js` to match — see **Scoping** below.

4. Add one script tag before `</body>`:

   ```html
   <script src="/server.js"></script>
   ```

That's it — page visits, scroll depth, and clicks start flowing on load.

## Sending custom events

```html
<script>
  trackEvent('lead_generation', 'contact_form_submit', 1, { email: 'a@b.com' });
</script>
```

Signature: `trackEvent(eventType, eventName, eventValue, data?, userId?)`.
Events are queued locally, not sent immediately — the service worker's own
10s interval (or the next Background Sync) does the actual send.

## Record status

Each queued record carries a `status`: `'created'` when `server.js` writes
it, flipped to `'failed'` (with `attempts` and `lastError`) by
`service-worker.js` if a send fails — it stays queued and gets retried on
the next flush. A successful send deletes the record outright, so there's
no `'done'` status to clean up. There's no `'picked'` state: only one
`flushQueue()` runs at a time in the service worker (see the `flushing`
guard), so nothing else could ever read the same batch concurrently.

## Idempotency

Every `/add-events` call carries an `Idempotency-Key` header:
`{sessionId}:{firstKey}-{lastKey}`, built from the batch's own IndexedDB
keys. If a response is lost after the backend already stored the batch,
the next retry resends the exact same key — so the backend can dedupe on
that header instead of double-storing the batch. (Keys come from
`autoIncrement`, so they're never reused, and the range stays stable across
retries as long as the queue isn't rewritten in between.)

## Scoping (running alongside another service worker)

A service worker's **scope** is the set of URLs it's allowed to control,
and it defaults to the directory the SW file is served from — a SW at
`/service-worker.js` defaults to scope `/`, the *entire* site. Registrations
are keyed by scope, not by script URL, so registering a second SW at that
same scope doesn't coexist with an existing one — it silently replaces it.

That's why `service-worker.js` here ships in its own `/mini-server/`
subfolder with an explicit scope to match:

```js
navigator.serviceWorker.register('/mini-server/service-worker.js', { scope: '/mini-server/' });
```

A scope can't be wider than the directory the script is served from unless
the server sends a `Service-Worker-Allowed` header — so keep the file inside
the folder named in `SERVICE_WORKER_SCOPE`. Any other SW on the site keeps
controlling its own scope untouched, and this one won't be able to clobber it.

Narrowing the scope doesn't cost anything here: this SW has no `fetch`
listener, so it never needs to "control" a page's navigation or requests.
`server.js` runs on every page and calls `sync.register('flush-events')`
straight off the `ServiceWorkerRegistration` object — that works regardless
of which pages fall inside the SW's scope, since the tag is delivered to the
SW directly, not routed through page-level interception.

## Gotchas

- **HTTPS required.** Service workers only run on `https://` or
  `http://localhost` — nothing else.
- **Cache the SW file for at most a few minutes** at your CDN/host — a
  stale service worker won't pick up a new `SW_VERSION` until the old
  cached copy expires and the browser re-checks it.
- **Bump `SW_VERSION` on every edit.** Browsers only install a new service
  worker when the file's bytes change; without a version bump, an edited
  file can keep running the old cached one indefinitely.
