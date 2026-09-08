// Mini event-tracking service worker.
// Batches whatever is queued in IndexedDB by server.js and PUTs it to
// `${API_BASE_URL}/add-events` every FLUSH_INTERVAL_MS. Never caches assets —
// its only job is reliable background delivery of tracked events.

// ---- Config: edit per site -------------------------------------------
const SW_VERSION = 'v1'; // bump this string on every edit so the browser installs the new SW instead of keeping the old one running
const API_BASE_URL = 'https://your-events-api.example.com'; // events server, no trailing slash
const TENANT_NAME = 'your-site.com'; // sent as the tenant_name header so the backend can attribute events to this site
// ------------------------------------------------------------------------

const DB_NAME = 'mini_server_events';
const STORE_NAME = 'queue';
const CACHE_PREFIX = 'mini-server-cache-';
const FLUSH_INTERVAL_MS = 10_000;
const MAX_BATCH_SIZE = 50;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_PREFIX + SW_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readQueueSnapshot() {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const items = [];
        const req = tx.objectStore(STORE_NAME).openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            items.push({ key: cursor.primaryKey, value: cursor.value });
            cursor.continue();
          } else {
            resolve(items);
          }
        };
        req.onerror = () => reject(req.error);
      })
  );
}

function removeFromQueue(keys) {
  if (keys.length === 0) return Promise.resolve();
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        keys.forEach((key) => store.delete(key));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

// Marks a batch 'failed' in place (bumping attempts/lastError) instead of
// deleting it, so it stays queued for the next retry.
function markBatchFailed(batch, err) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        batch.forEach((item) =>
          store.put({
            ...item.value,
            status: 'failed',
            attempts: (item.value.attempts || 0) + 1,
            lastError: String((err && err.message) || err),
          })
        );
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

// Mirrors isValidRecord in server.js — drops anything left behind by an
// older/incompatible schema instead of sending it.
function isValidRecord(value) {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof value.sessionId === 'string' &&
    value.sessionId.length > 0 &&
    !!value.event &&
    typeof value.event === 'object'
  );
}

// The only place that talks to the network. Runs on the interval below —
// events are never sent the instant they're queued, only on this cadence.
// A failed fetch is re-thrown after marking the batch (see markBatchFailed)
// so the browser's own Background Sync retry/backoff can still pick it back
// up on the next 'sync' event.
//
// No separate 'picked'/in-flight status is stored in IndexedDB: this flag
// already guarantees only one flushQueue() body runs at a time in this SW,
// which is the only thing that ever reads the queue — so nothing else could
// pick the same batch concurrently.
let flushing = false;

function flushQueue() {
  if (flushing) return Promise.resolve();
  flushing = true;
  return readQueueSnapshot().then((snapshot) => {
    const corrupt = snapshot.filter((item) => !isValidRecord(item.value));
    const cleanup = corrupt.length > 0 ? removeFromQueue(corrupt.map((item) => item.key)) : Promise.resolve();

    const valid = snapshot.filter((item) => isValidRecord(item.value));
    if (valid.length === 0) return cleanup;

    // Cursor walks keys ascending (oldest first), so the last MAX_BATCH_SIZE
    // entries are the most recently queued ones. Backlog beyond that stays
    // queued for the next tick.
    const batch = valid.slice(-MAX_BATCH_SIZE);
    const sessionId = batch[0].value.sessionId;
    const events = batch.map((item) => item.value.event);
    // Derived from the batch's own IndexedDB keys (stable, never reused by
    // autoIncrement) — not from the current time, so a retry of this exact
    // batch after a lost response reuses the same key instead of minting a
    // new one, which is what lets the backend dedupe it.
    const idempotencyKey = `${sessionId}:${batch[0].key}-${batch[batch.length - 1].key}`;
    return cleanup.then(() =>
      fetch(`${API_BASE_URL}/add-events`, {
        method: 'PUT',
        headers: {
          tenant_name: TENANT_NAME,
          session_id: sessionId,
          'Idempotency-Key': idempotencyKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`add-events failed: ${res.status}`);
          return removeFromQueue(batch.map((item) => item.key));
        })
        .catch((err) => markBatchFailed(batch, err).then(() => { throw err; }))
    );
  }).finally(() => {
    flushing = false;
  });
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'flush-events') {
    event.waitUntil(flushQueue());
  }
});

// Batching cadence. The browser can terminate an idle SW at any time, which
// cancels this interval — it resumes as soon as the SW is next woken (by
// 'sync', a page load, etc). The 'sync' listener above is the backstop.
setInterval(flushQueue, FLUSH_INTERVAL_MS);
