// Deferred event path. Mirrors mini_server_docs/server.js: events are written
// to IndexedDB here and the service worker (public/service-worker.js) batches
// and delivers them on its own cadence. This module never calls fetch — when
// the caller needs the response or a right-now flush, use sendEventNow.js.

const DB_NAME = "mini_server_events";
const STORE_NAME = "queue";
const SESSION_ID_KEY = "mini_server_session_id";

const BASE_URL = import.meta.env.BASE_URL || "/";
const SW_URL = `${BASE_URL}service-worker.js`;
const SW_SCOPE = BASE_URL;

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

// trackEvent(eventType, eventName, eventValue, data, userId) — queues into
// IndexedDB; the service worker sends it in the next batch. Resolves once
// written locally (not once delivered). Never rejects — a broken IndexedDB
// should not take down a page.
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
  })
    .then(() => nudgeBackgroundSync())
    .catch((err) => {
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

export function nudgeBackgroundSync() {
  if (registration && "sync" in registration) {
    registration.sync.register("flush-events").catch(() => {});
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    registration = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
    nudgeBackgroundSync();
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
