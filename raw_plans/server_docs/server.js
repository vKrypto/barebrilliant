// Mini event-tracking client. Drop-in <script> — no bundler required.
//
// Role, and nothing more: queues events into IndexedDB and asks the service
// worker for a background sync. All network delivery (batching, retry,
// /add-events) lives in service-worker.js — this file never calls fetch.
//
// Auto-tracks page_visit, scroll depth, and clicks on load. For anything
// else, call window.trackEvent(eventType, eventName, eventValue, data, userId).

(function () {
  // ---- Config: edit per site --------------------------------------------
  var SERVICE_WORKER_PATH = '/service-worker.js'; // where the SW file is served from
  var SERVICE_WORKER_SCOPE = '/'; // narrow, dedicated scope so this SW doesn't collide with/replace another SW already registered on this site
  // ------------------------------------------------------------------------

  var DB_NAME = 'mini_server_events';
  var STORE_NAME = 'queue';
  var SESSION_ID_KEY = 'mini_server_session_id';

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        req.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  // getSessionId() → 32-char hex string, cached in localStorage across visits
  function getSessionId() {
    var id = localStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, '');
      localStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  }

  // microsecondTimestamp() → "2026-08-22T10:15:30.123000Z" (backend expects 6 fractional digits)
  function microsecondTimestamp() {
    return new Date().toISOString().replace(/\.(\d{3})Z$/, '.$1000Z');
  }

  function collectBrowserInfo() {
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
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).add(record);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  // Registered once per page load, not per event — the SW's own 10s interval
  // is what batches events; this is only a one-time nudge plus the
  // tab-closed/reconnect safety net.
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return Promise.resolve();
    return navigator.serviceWorker.register(SERVICE_WORKER_PATH, { scope: SERVICE_WORKER_SCOPE }).then(function (reg) {
      if ('sync' in reg) {
        return reg.sync.register('flush-events').catch(function () {});
      }
    }).catch(function () {
      // unsupported/blocked — events still queue in IndexedDB, picked up once a SW runs
    });
  }

  // trackEvent('lead_generation', 'contact_form_submit', 1, { email: 'a@b.com' }) → queues it in
  // IndexedDB; the service worker's own interval picks it up and sends it in the next batch.
  function trackEvent(eventType, eventName, eventValue, data, userId) {
    return enqueue({
      sessionId: getSessionId(),
      status: 'created', // service worker flips this to 'failed' on a delivery error; a successful send deletes the record outright
      event: {
        event_type: eventType,
        event_name: eventName,
        event_value: eventValue,
        data: data || {},
        user_id: userId || '',
        user_info: {},
        browser_info: collectBrowserInfo(),
        send_time: microsecondTimestamp(),
      },
    });
  }

  // getElementXPath(buttonEl) → '//*[@id="submit"]' or '/body[1]/main[1]/button[2]'
  function getElementXPath(el) {
    if (el.id) return '//*[@id="' + el.id + '"]';
    var parts = [];
    var node = el;
    while (node && node !== document.documentElement) {
      var index = 1;
      var sibling = node.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === node.tagName) index++;
        sibling = sibling.previousElementSibling;
      }
      parts.unshift(node.tagName.toLowerCase() + '[' + index + ']');
      node = node.parentElement;
    }
    return '/' + parts.join('/');
  }

  window.trackEvent = trackEvent;
  registerServiceWorker();

  // Auto-tracked monitor events — each wired straight to its DOM listener, no wrapper functions.
  trackEvent('monitor', 'page_visit', 1, {
    current_path: location.pathname,
    query_params: Object.fromEntries(new URLSearchParams(location.search)),
  });

  document.addEventListener('click', function (e) {
    var anchor = e.target.closest && e.target.closest('a[href]');
    if (anchor) {
      trackEvent('monitor', 'href_click', 1, { current_path: location.pathname, link_path: anchor.getAttribute('href') || '' });
    }
    trackEvent('monitor', 'click', 1, { elementXPath: getElementXPath(e.target) });
  });

  var scrollTimer;
  window.addEventListener('scroll', function () {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () {
      var max = document.documentElement.scrollHeight - innerHeight; // 0 when the page doesn't scroll at all
      trackEvent('monitor', 'scroll', max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 1, { current_location: location.pathname });
    }, 300);
  }, { passive: true });
})();
