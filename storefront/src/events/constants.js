// Canonical event vocabulary. `event_type` is the broad channel, `event_name`
// the specific thing that happened — both go on the wire to /add-events.

export const EVENT_TYPES = {
  MONITOR: "monitor", // passive page telemetry
  LEAD: "lead", // enquiry lifecycle
  ORDER: "order", // order lifecycle
};

export const EVENTS = {
  // monitor — auto-tracked by tracker.js / RouteTracker
  PAGE_VISIT: "page_visit",
  SCROLL: "scroll",
  CLICK: "click",
  HREF_CLICK: "href_click",
  BANNER_CLICK: "banner_click",

  // lead — fired from the /chat flow (storefront)
  LEAD_GENERATED: "lead_generated",
  LEAD_SUBMITTED: "lead_submitted",
  // lead — fired from the CRM (dashboard) when a human triages the enquiry
  LEAD_APPROVED: "lead_approved",
  LEAD_REJECTED: "lead_rejected",

  // order — order_placed is storefront checkout; the rest are dashboard-driven
  ORDER_PLACED: "order_placed",
  ORDER_SHIPPED: "order_shipped",
  ORDER_DELIVERED: "order_delivered",
};
