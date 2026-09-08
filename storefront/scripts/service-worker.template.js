// TEMPLATE — scripts/gen-build-config.mjs fills the __PLACEHOLDERS__ and writes
// the result to public/service-worker.js (git-ignored, regenerated every build).
//
// Ported from server_docs/service-worker.js. Two jobs:
//
//  1. Reliable background delivery of tracked events. src/events/tracker.js
//     queues events into IndexedDB and never touches the network. Every
//     FLUSH_INTERVAL_MS (10s) this worker drains the ENTIRE queue in FIFO
//     batches of MAX_BATCH_SIZE (with a per-tick safety cap). Delivery policy
//     per batch: 1 attempt + RETRY_DELAYS_MS.length retries with exponential
//     backoff; if every attempt fails, a circuit breaker pauses the whole
//     pipeline for CIRCUIT_PAUSE_MS (30 min). Events keep queuing during the
//     pause — nothing is lost. Background Sync is the backstop when the tab
//     closes before a flush.
//
//  2. Cache-bust on deploy. Each GitHub Actions run bakes a fresh SW_VERSION
//     below, so the browser downloads new bytes and installs a new worker.
//     `activate` deletes every Cache Storage entry, resets the circuit breaker
//     (fresh start — a deploy may have fixed the endpoint), and posts
//     SW_UPDATED to open tabs, which reload once (see src/events/swClient.js).
//
// Registered at the app's own scope (import.meta.env.BASE_URL). The storefront
// runs no other service worker, so root scope is safe and lets `activate`
// claim the open pages and message them.

const SW_VERSION = "__SW_VERSION__";
const API_BASE_URL = "__LAMBDA_URL__"; // no trailing slash; empty until the Lambda exists
const TENANT_NAME = "__TENANT_NAME__";
const BUILD_TIME = "__BUILD_TIME__";

const DB_NAME = "mini_server_events";
const DB_VERSION = 2; // v2 adds the META_STORE for circuit-breaker state
const QUEUE_STORE = "queue";
const META_STORE = "meta";
const CIRCUIT_KEY = "circuit";

const FLUSH_INTERVAL_MS = 10_000; // flush cadence
const MAX_BATCH_SIZE = 50; // events per PUT
const MAX_BATCHES_PER_FLUSH = 40; // safety cap: ≤2000 events/tick, rest waits for the next tick
const RETRY_DELAYS_MS = [1000, 2000, 4000]; // 3 retries, exponential backoff (1s, 2s, 4s)
const CIRCUIT_PAUSE_MS = 30 * 60 * 1000; // pause 30 min after all retries fail

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await writeCircuit({ pausedUntil: 0, trips: 0 }).catch(() => {}); // fresh start on deploy
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        client.postMessage({ type: "SW_UPDATED", version: SW_VERSION, buildTime: BUILD_TIME });
      }
    })()
  );
});

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "k" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---- circuit-breaker state (survives SW restarts; reset on deploy) ----------
function readCircuit() {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        const req = db.transaction(META_STORE, "readonly").objectStore(META_STORE).get(CIRCUIT_KEY);
        req.onsuccess = () => resolve(req.result || { k: CIRCUIT_KEY, pausedUntil: 0, trips: 0 });
        req.onerror = () => resolve({ k: CIRCUIT_KEY, pausedUntil: 0, trips: 0 });
      })
  );
}

function writeCircuit(patch) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(META_STORE, "readwrite");
        tx.objectStore(META_STORE).put({ k: CIRCUIT_KEY, pausedUntil: 0, trips: 0, ...patch });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

// ---- queue helpers --------------------------------------------------------
function readQueueSnapshot() {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(QUEUE_STORE, "readonly");
        const items = [];
        const req = tx.objectStore(QUEUE_STORE).openCursor();
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
        const tx = db.transaction(QUEUE_STORE, "readwrite");
        const store = tx.objectStore(QUEUE_STORE);
        keys.forEach((key) => store.delete(key));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

// Marks a batch 'failed' in place (bumping attempts/lastError) instead of
// deleting it, so it stays queued and is retried after the circuit pause.
function markBatchFailed(batch, err) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(QUEUE_STORE, "readwrite");
        const store = tx.objectStore(QUEUE_STORE);
        batch.forEach((item) =>
          store.put({
            ...item.value,
            status: "failed",
            attempts: (item.value.attempts || 0) + 1,
            lastError: String((err && err.message) || err),
          })
        );
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

// Mirrors the client: drop anything left behind by an older/incompatible schema.
function isValidRecord(value) {
  return (
    !!value &&
    typeof value === "object" &&
    typeof value.sessionId === "string" &&
    value.sessionId.length > 0 &&
    !!value.event &&
    typeof value.event === "object"
  );
}

// PUT one batch. Retries on ANY failure (network error or non-2xx) with
// exponential backoff: attempt, wait 1s, retry, wait 2s, retry, wait 4s, retry.
// The Idempotency-Key is derived from the batch's own IndexedDB keys, so every
// retry carries the same key and the backend can dedupe a lost-response resend.
// Returns true if delivered, false once all attempts are exhausted.
async function sendBatchWithRetry(batch) {
  const sessionId = batch[0].value.sessionId;
  const events = batch.map((item) => item.value.event);
  const idempotencyKey = `${sessionId}:${batch[0].key}-${batch[batch.length - 1].key}`;
  const init = {
    method: "PUT",
    headers: {
      tenant_name: TENANT_NAME,
      session_id: sessionId,
      "Idempotency-Key": idempotencyKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ events }),
  };

  let lastError;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt - 1]);
    try {
      const res = await fetch(`${API_BASE_URL}/add-events`, init);
      if (res.ok) return true;
      lastError = new Error(`add-events HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
  }
  await markBatchFailed(batch, lastError);
  return false;
}

let flushing = false;

// Drains the whole queue: FIFO batches of MAX_BATCH_SIZE until empty (or the
// per-tick cap). A batch that fails all retries trips the circuit breaker and
// stops this run; the interval below then no-ops until the pause elapses.
async function flushQueue() {
  if (flushing) return;
  if (!API_BASE_URL) return; // no backend configured yet — leave everything queued

  const circuit = await readCircuit();
  if (circuit.pausedUntil > Date.now()) return; // circuit open — skip this tick

  flushing = true;
  try {
    for (let n = 0; n < MAX_BATCHES_PER_FLUSH; n++) {
      const snapshot = await readQueueSnapshot();

      const corrupt = snapshot.filter((item) => !isValidRecord(item.value));
      if (corrupt.length) await removeFromQueue(corrupt.map((item) => item.key));

      const valid = snapshot.filter((item) => isValidRecord(item.value));
      if (valid.length === 0) {
        if (circuit.pausedUntil || circuit.trips) await writeCircuit({ pausedUntil: 0, trips: 0 });
        return; // queue fully drained
      }

      const batch = valid.slice(0, MAX_BATCH_SIZE); // oldest first
      const delivered = await sendBatchWithRetry(batch);
      if (!delivered) {
        await writeCircuit({
          pausedUntil: Date.now() + CIRCUIT_PAUSE_MS,
          trips: (circuit.trips || 0) + 1,
          lastTripAt: new Date().toISOString(),
        });
        return; // paused for CIRCUIT_PAUSE_MS
      }
      await removeFromQueue(batch.map((item) => item.key));
    }
    // hit MAX_BATCHES_PER_FLUSH — the rest goes on the next 10s tick
  } finally {
    flushing = false;
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "flush-events") event.waitUntil(flushQueue());
});

// src/events/sendEventNow.js -> flushNow() posts this to force an immediate drain.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FLUSH_NOW") event.waitUntil(flushQueue());
});

setInterval(flushQueue, FLUSH_INTERVAL_MS);
