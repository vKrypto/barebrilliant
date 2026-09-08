// Exercises the real delivery logic in scripts/service-worker.template.js in a
// mocked service-worker scope (fake-indexeddb + a controllable fetch + instant
// timers). Run:  node scripts/sw-flush.test.mjs
//
// Verifies: 10s-cadence flush drains the WHOLE queue in batches of 50; a batch
// that fails retries 3× with exponential backoff; 3 failed retries trip a
// 30-minute circuit-breaker pause that later ticks respect; a deploy
// (`activate`) clears the pause.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import "fake-indexeddb/auto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ---- mocked SW scope ----------------------------------------------------------
const listeners = {};
let fetchImpl = async () => new Response("{}", { status: 200 });
const sleeps = [];

globalThis.self = {
  addEventListener: (type, fn) => (listeners[type] = fn),
  skipWaiting: () => {},
  clients: { claim: async () => {}, matchAll: async () => [] },
};
globalThis.caches = { keys: async () => [], delete: async () => {} };
globalThis.fetch = (...a) => fetchImpl(...a);
globalThis.setInterval = () => 0; // don't let the SW's own interval spin during the test
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms) => {
  sleeps.push(ms); // record backoff delays, then fire immediately
  return realSetTimeout(fn, 0);
};

// Load the template (placeholders filled) and grab its internals.
const src = readFileSync(resolve(root, "scripts/service-worker.template.js"), "utf8")
  .replace("__SW_VERSION__", "test")
  .replace("__LAMBDA_URL__", "https://lambda.test")
  .replace("__TENANT_NAME__", "test.local")
  .replace("__BUILD_TIME__", new Date().toISOString());
// eslint-disable-next-line no-eval
eval(src + "\n;globalThis.__sw = { flushQueue, readCircuit, openDb, QUEUE_STORE, META_STORE };");
const sw = globalThis.__sw;

// ---- helpers (go through the SW's own openDb so the v2 schema is created) ---
async function store(mode) {
  const db = await sw.openDb();
  return db.transaction(sw.QUEUE_STORE, mode).objectStore(sw.QUEUE_STORE);
}
async function seed(n) {
  const s = await store("readwrite");
  for (let i = 0; i < n; i++) {
    s.add({ sessionId: "sess_test", status: "created", event: { event_name: "page_visit", i } });
  }
  await new Promise((res) => (s.transaction.oncomplete = res));
}
async function queueCount() {
  const s = await store("readonly");
  return new Promise((res) => (s.count().onsuccess = (e) => res(e.target.result)));
}
async function firstRecord() {
  const s = await store("readonly");
  return new Promise((res) => (s.openCursor().onsuccess = (e) => res(e.target.result?.value)));
}
// Clear both stores between cases (deleteDatabase would block on open handles).
async function clearDb() {
  const db = await sw.openDb();
  await new Promise((res, rej) => {
    const tx = db.transaction([sw.QUEUE_STORE, sw.META_STORE], "readwrite");
    tx.objectStore(sw.QUEUE_STORE).clear();
    tx.objectStore(sw.META_STORE).clear();
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
}

let pass = 0;
const ok = (msg) => (pass++, console.log(`  ✓ ${msg}`));

// ---- 1: drains the WHOLE queue in one flush (120 events -> 3 batches) --------
{
  await clearDb();
  let calls = 0;
  const seenBatchSizes = [];
  fetchImpl = async (_url, init) => {
    calls++;
    seenBatchSizes.push(JSON.parse(init.body).events.length);
    return new Response("{}", { status: 200 });
  };
  await seed(120);
  await sw.flushQueue();
  assert.equal(await queueCount(), 0, "queue fully drained");
  assert.equal(calls, 3, "3 PUTs for 120 events");
  assert.deepEqual(seenBatchSizes, [50, 50, 20], "FIFO batches of 50, then remainder");
  ok("one 10s flush delivers ALL queued events (batched by 50)");
}

// ---- 2: retry 3x with exponential backoff, then succeed ---------------------
{
  await clearDb();
  sleeps.length = 0;
  let calls = 0;
  fetchImpl = async () => {
    calls++;
    if (calls <= 3) throw new Error("network down");
    return new Response("{}", { status: 200 });
  };
  await seed(2);
  await sw.flushQueue();
  assert.equal(calls, 4, "1 attempt + 3 retries");
  assert.deepEqual(sleeps, [1000, 2000, 4000], "exponential backoff 1s / 2s / 4s between retries");
  assert.equal(await queueCount(), 0, "batch delivered on the 4th attempt, queue cleared");
  ok("failed send retries 3× with exponential backoff");
}

// ---- 3: 3 retries all fail -> 30-minute circuit-breaker pause ---------------
{
  await clearDb();
  let calls = 0;
  fetchImpl = async () => {
    calls++;
    return new Response("nope", { status: 503 });
  };
  await seed(5);
  const before = Date.now();
  await sw.flushQueue();
  assert.equal(calls, 4, "1 + 3 attempts, then give up");
  assert.equal(await queueCount(), 5, "events kept in the queue for later");
  assert.equal((await firstRecord()).status, "failed", "records marked failed (attempts bumped)");
  const circuit = await sw.readCircuit();
  const pauseMs = circuit.pausedUntil - before;
  assert.ok(pauseMs > 29 * 60_000 && pauseMs <= 30 * 60_000 + 5000, `paused ~30 min (got ${Math.round(pauseMs / 60000)} min)`);
  assert.equal(circuit.trips, 1, "trip counted");
  ok("3 failed retries trip a ~30-minute pause; events retained");

  // ---- 4: while paused, the next tick is a no-op ---------------------------
  calls = 0;
  await sw.flushQueue();
  assert.equal(calls, 0, "no network calls while the circuit is open");
  ok("subsequent 10s ticks are skipped until the pause elapses");

  // ---- 5: activate() (a deploy) clears the pause -------------------------
  await listeners.activate({ waitUntil: (p) => p });
  await new Promise((r) => realSetTimeout(r, 10));
  assert.equal((await sw.readCircuit()).pausedUntil, 0, "circuit reset on activate");
  fetchImpl = async () => new Response("{}", { status: 200 });
  await sw.flushQueue();
  assert.equal(await queueCount(), 0, "flush resumes and drains after a deploy");
  ok("a deploy (activate) clears the pause and delivery resumes");
}

console.log(`\n${pass} checks passed`);
