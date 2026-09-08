// Canonical event vocabulary. `event_type` is the broad channel, `event_name`
// the specific thing that happened — both go on the wire to /add-events.
// Phase-1 names are kept; phase-2 adds the shopping-flow names aligned with the
// spec's analytics taxonomy (BARE BRILLIANT WEBSITE.pdf §Analytics Event Taxonomy).

export const EVENT_TYPES = {
  MONITOR: "monitor", // passive page telemetry
  LEAD: "lead", // enquiry lifecycle
  ORDER: "order", // order lifecycle
  SHOP: "shop", // catalog / PDP / cart / shortlist interactions
};

export const EVENTS = {
  // monitor — auto-tracked by tracker.js / RouteTracker
  PAGE_VISIT: "page_visit",
  SCROLL: "scroll",
  CLICK: "click",
  HREF_CLICK: "href_click",
  BANNER_CLICK: "banner_click",

  // lead — /chat flow (storefront) + CRM-driven states
  LEAD_GENERATED: "lead_generated",
  LEAD_SUBMITTED: "lead_submitted",
  LEAD_APPROVED: "lead_approved",
  LEAD_REJECTED: "lead_rejected",

  // shop — catalog + PDP + cart + shortlist
  PRODUCT_VIEW: "product_view",
  PRODUCT_CLICK: "product_click",
  FILTER_CHANGE: "filter_change",
  SORT_CHANGE: "sort_change",
  ADD_TO_CART: "add_to_cart",
  REMOVE_FROM_CART: "remove_from_cart",
  SHORTLIST_SAVED: "shortlist_saved",
  SHORTLIST_REMOVED: "shortlist_removed",
  CHECKOUT_STARTED: "checkout_started",

  // order — order_placed is storefront checkout; the rest are dashboard-driven
  ORDER_PLACED: "order_placed",
  ORDER_SHIPPED: "order_shipped",
  ORDER_DELIVERED: "order_delivered",
};
