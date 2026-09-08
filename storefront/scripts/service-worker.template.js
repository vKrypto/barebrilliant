// TEMPLATE — scripts/gen-build-config.mjs fills the __PLACEHOLDERS__ and writes
// the result to public/service-worker.js (git-ignored, regenerated every build).
//
// Ported from mini_server_docs/service-worker.js. Two jobs:
//
//  1. Reliable background delivery of tracked events. src/events/tracker.js
//     queues events into IndexedDB and never touches the network; this worker
//     batches up to 50 and PUTs them to `${API_BASE_URL}/add-events` every 10s,
//     with Background Sync as the backstop when the tab closes first.
//
//  2. Cache-bust on deploy. Each GitHub Actions run bakes a fresh SW_VERSION
//     below, so the browser downloads new bytes and installs a new worker.
//     `activate` then deletes every Cache Storage entry on the origin and posts
//     SW_UPDATED to open tabs, which reload once (see src/events/swClient.js) —
//     that is how a changed frontend bundle or a changed LAMBDA_URL takes hold.
//
// This worker registers at the app's own scope (import.meta.env.BASE_URL). The
// storefront runs no other service worker, so there is nothing to collide with,
// and root scope is what lets `activate` claim the open pages and message them.

const SW_VERSION = "__SW_VERSION__";
const API_BASE_URL = "__LAMBDA_URL__"; // no trailing slash; empty until the Lambda exists
const TENANT_NAME = "__TENANT_NAME__";
const BUILD_TIME = "__BUILD_TIME__";

const DB_NAME = "mini_server_events";
const STORE_NAME = "queue";
const FLUSH_INTERVAL_MS = 10_000;
const MAX_BATCH_SIZE = 50;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // "clean all the cache" — every Cache Storage entry on this origin.
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
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
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readQueueSnapshot() {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
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
        const tx = db.transaction(STORE_NAME, "readwrite");
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
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
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

// The only place that talks to the network. A failed fetch is re-thrown after
// marking the batch so Background Sync's retry/backoff can pick it up again.
let flushing = false;

function flushQueue() {
  if (flushing) return Promise.resolve();
  if (!API_BASE_URL) return Promise.resolve(); // no backend configured yet — leave everything queued
  flushing = true;
  return readQueueSnapshot()
    .then((snapshot) => {
      const corrupt = snapshot.filter((item) => !isValidRecord(item.value));
      const cleanup =
        corrupt.length > 0 ? removeFromQueue(corrupt.map((item) => item.key)) : Promise.resolve();

      const valid = snapshot.filter((item) => isValidRecord(item.value));
      if (valid.length === 0) return cleanup;

      const batch = valid.slice(-MAX_BATCH_SIZE);
      const sessionId = batch[0].value.sessionId;
      const events = batch.map((item) => item.value.event);
      const idempotencyKey = `${sessionId}:${batch[0].key}-${batch[batch.length - 1].key}`;
      return cleanup.then(() =>
        fetch(`${API_BASE_URL}/add-events`, {
          method: "PUT",
          headers: {
            tenant_name: TENANT_NAME,
            session_id: sessionId,
            "Idempotency-Key": idempotencyKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ events }),
        })
          .then((res) => {
            if (!res.ok) throw new Error(`add-events failed: ${res.status}`);
            return removeFromQueue(batch.map((item) => item.key));
          })
          .catch((err) =>
            markBatchFailed(batch, err).then(() => {
              throw err;
            })
          )
      );
    })
    .finally(() => {
      flushing = false;
    });
}

self.addEventListener("sync", (event) => {
  if (event.tag === "flush-events") event.waitUntil(flushQueue());
});

// src/events/sendEventNow.js -> flushNow() posts this to force an immediate drain.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FLUSH_NOW") event.waitUntil(flushQueue());
});

setInterval(flushQueue, FLUSH_INTERVAL_MS);
