// Public surface of the events module.
//
//   trackEvent(...)      deferred  — queue in IndexedDB, service worker delivers
//   sendEventNow(...)    immediate — PUT now, resolve with the response
//   flushNow()           ask the service worker to drain the queue now
//   initTracker()        one-time setup (call from main.jsx)
//   trackPageVisit(...)  page_visit for the current route (RouteTracker)
//
// Plus the named helpers below so call sites pass a payload and never restate
// the type/name pair.

export {
  initTracker,
  trackEvent,
  trackPageVisit,
  getSessionId,
  nudgeBackgroundSync,
} from "./tracker.js";
export { sendEventNow, send_event_now, flushNow } from "./sendEventNow.js";
export { EVENTS, EVENT_TYPES } from "./constants.js";

import { trackEvent } from "./tracker.js";
import { EVENT_TYPES, EVENTS } from "./constants.js";

// --- lead (phase 1) ---
export const trackLeadGenerated = (data = {}) =>
  trackEvent(EVENT_TYPES.LEAD, EVENTS.LEAD_GENERATED, 1, data);
export const trackLeadSubmitted = (data = {}) =>
  trackEvent(EVENT_TYPES.LEAD, EVENTS.LEAD_SUBMITTED, 1, data);

// --- monitor ---
export const trackBannerClick = (data = {}) =>
  trackEvent(EVENT_TYPES.MONITOR, EVENTS.BANNER_CLICK, 1, data);

// --- shop (phase 2) — all deferred; timing does not matter ---
export const trackProductView = (data = {}) =>
  trackEvent(EVENT_TYPES.SHOP, EVENTS.PRODUCT_VIEW, 1, data);
export const trackProductClick = (data = {}) =>
  trackEvent(EVENT_TYPES.SHOP, EVENTS.PRODUCT_CLICK, 1, data);
export const trackFilterChange = (data = {}) =>
  trackEvent(EVENT_TYPES.SHOP, EVENTS.FILTER_CHANGE, 1, data);
export const trackSortChange = (data = {}) =>
  trackEvent(EVENT_TYPES.SHOP, EVENTS.SORT_CHANGE, 1, data);
export const trackAddToCart = (data = {}) =>
  trackEvent(EVENT_TYPES.SHOP, EVENTS.ADD_TO_CART, data.qty || 1, data);
export const trackRemoveFromCart = (data = {}) =>
  trackEvent(EVENT_TYPES.SHOP, EVENTS.REMOVE_FROM_CART, 1, data);
export const trackShortlistSaved = (data = {}) =>
  trackEvent(EVENT_TYPES.SHOP, EVENTS.SHORTLIST_SAVED, 1, data);
export const trackShortlistRemoved = (data = {}) =>
  trackEvent(EVENT_TYPES.SHOP, EVENTS.SHORTLIST_REMOVED, 1, data);
export const trackCheckoutStarted = (data = {}) =>
  trackEvent(EVENT_TYPES.SHOP, EVENTS.CHECKOUT_STARTED, 1, data);

// --- order --- (order_placed itself is sent via sendEventNow at the call site)
export const trackOrderPlaced = (data = {}) =>
  trackEvent(EVENT_TYPES.ORDER, EVENTS.ORDER_PLACED, data.total || 1, data);
