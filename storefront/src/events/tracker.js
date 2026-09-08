// Deferred event path. Mirrors server_docs/server.js: events are written to
// IndexedDB here and the service worker (public/service-worker.js) batches and
// delivers them on its own cadence (10s flush, 3 retries w/ exponential
// backoff, 30-min circuit-breaker pause). This module never calls fetch — when
// the caller needs the response or a right-now flush, use sendEventNow.js.

const DB_NAME = "mini_server_events";
const DB_VERSION = 2; // v2 adds the "meta" store the SW uses for circuit-breaker state
const STORE_NAME = "queue";
const META_STORE = "meta";
const SESSION_ID_KEY = "mini_server_session_id";

const BASE_URL = import.meta.env.BASE_URL || "/";
const SW_URL = `${BASE_URL}service-worker.js`;
const SW_SCOPE = BASE_URL;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
      // Written only by the service worker; created here too so whichever of
      // the page / SW opens the DB first establishes the v2 schema.
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "k" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// getSessionId() -> 32-char hex, cached in localStorage across visits.
export function getSessionId() {
  let id = null;
  try {
    id = localStorage.getItem(SESSION_ID_KEY);
  } catch {
    /* private mode / storage disabled */
  }
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`).replace(/-/g, "");
    try {
      localStorage.setItem(SESSION_ID_KEY, id);
    } catch {
      /* ignore */
    }
  }
  return id;
}

// Backend expects 6 fractional digits: "2026-09-08T10:15:30.123000Z".
export function microsecondTimestamp() {
  return new Date().toISOString().replace(/\.(\d{3})Z$/, ".$1000Z");
}

export function collectBrowserInfo() {
  return {
    user_agent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screen_width: screen.width,
    screen_height: screen.height,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document.referrer,
    url: window.location.href,
  };
}

function enqueue(record) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).add(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

// trackEvent(eventType, eventName, eventValue, data, userId) — writes the event
// to IndexedDB and stops. It does NOT poke the service worker: delivery is the
// SW's own 10s interval (see FLUSH_INTERVAL_MS in service-worker.template.js),
// with Background Sync as the backstop. Nudging on every event would make each
// navigation / click flush immediately, which defeats the batching. Use
// sendEventNow() when a call genuinely needs to go out right away.
// Resolves once written locally (not once delivered); never rejects — a broken
// IndexedDB must not take down a page.
export function trackEvent(eventType, eventName, eventValue = 1, data = {}, userId = "") {
  return enqueue({
    sessionId: getSessionId(),
    status: "created",
    event: {
      event_type: eventType,
      event_name: eventName,
      event_value: eventValue,
      data: data || {},
      user_id: userId || "",
      user_info: {},
      browser_info: collectBrowserInfo(),
      send_time: microsecondTimestamp(),
    },
  }).catch((err) => {
    console.warn("[tracker] enqueue failed:", err);
  });
}

// page_visit — call on first load and on every SPA route change (RouteTracker).
export function trackPageVisit(path = location.pathname, extra = {}) {
  return trackEvent("monitor", "page_visit", 1, {
    current_path: path,
    query_params: Object.fromEntries(new URLSearchParams(location.search)),
    ...extra,
  });
}

function getElementXPath(el) {
  if (!el || el.nodeType !== 1) return "";
  if (el.id) return `//*[@id="${el.id}"]`;
  const parts = [];
  let node = el;
  while (node && node !== document.documentElement) {
    let index = 1;
    let sibling = node.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === node.tagName) index++;
      sibling = sibling.previousElementSibling;
    }
    parts.unshift(`${node.tagName.toLowerCase()}[${index}]`);
    node = node.parentElement;
  }
  return "/" + parts.join("/");
}

let registration = null;

// Registers a one-off Background Sync. Called once per page load (below) so the
// browser will drain the queue if the tab closes before the SW's 10s tick, or
// when connectivity returns. NOT called per event — that would collapse the
// batching into an immediate flush on every navigation / click.
export function nudgeBackgroundSync() {
  if (registration && "sync" in registration) {
    registration.sync.register("flush-events").catch(() => {});
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    registration = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
    nudgeBackgroundSync(); // once, on load
  } catch (err) {
    console.warn("[tracker] service worker registration failed; events still queue locally:", err);
  }
}

let started = false;

// initTracker() — call once on app start. Registers the service worker and
// wires the auto-tracked monitor events: click, href_click, banner_click,
// scroll depth. page_visit is fired per route by <RouteTracker/>.
export function initTracker() {
  if (started || typeof window === "undefined") return;
  started = true;

  registerServiceWorker();

  document.addEventListener(
    "click",
    (e) => {
      const target = e.target;
      if (target && target.closest) {
        const anchor = target.closest("a[href]");
        if (anchor) {
          trackEvent("monitor", "href_click", 1, {
            current_path: location.pathname,
            link_path: anchor.getAttribute("href") || "",
          });
        }
        const banner = target.closest("[data-banner]");
        if (banner) {
          trackEvent("monitor", "banner_click", 1, {
            current_path: location.pathname,
            banner_id: banner.getAttribute("data-banner") || "",
          });
        }
      }
      trackEvent("monitor", "click", 1, { elementXPath: getElementXPath(target) });
    },
    true
  );

  let scrollTimer;
  window.addEventListener(
    "scroll",
    () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        trackEvent(
          "monitor",
          "scroll",
          max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1,
          { current_path: location.pathname }
        );
      }, 300);
    },
    { passive: true }
  );
}
