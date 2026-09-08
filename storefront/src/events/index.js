// Public surface of the events module.
//
//   trackEvent(...)      deferred  — queue in IndexedDB, service worker delivers
//   sendEventNow(...)    immediate — PUT now, resolve with the response
//   flushNow()           ask the service worker to drain the queue now
//   initTracker()        one-time setup (call from main.jsx)
//   trackPageVisit(...)  page_visit for the current route (RouteTracker)
//
// Plus the named helpers below for the events the plan calls out by name, so
// callers pass a payload and never restate the type/name pair.

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

export const trackLeadGenerated = (data = {}) =>
  trackEvent(EVENT_TYPES.LEAD, EVENTS.LEAD_GENERATED, 1, data);

export const trackLeadSubmitted = (data = {}) =>
  trackEvent(EVENT_TYPES.LEAD, EVENTS.LEAD_SUBMITTED, 1, data);

export const trackBannerClick = (data = {}) =>
  trackEvent(EVENT_TYPES.MONITOR, EVENTS.BANNER_CLICK, 1, data);

export const trackOrderPlaced = (data = {}) =>
  trackEvent(EVENT_TYPES.ORDER, EVENTS.ORDER_PLACED, 1, data);
