// Immediate event path. Unlike trackEvent() (queue + let the service worker
// deliver it later), sendEventNow() PUTs to the events backend right now and
// resolves with the parsed response body — for when the caller needs the
// backend's answer, or a guaranteed flush, before it can continue.
//
// Same wire format and /add-events contract as the service worker, so a single
// event sent here and a batch sent by the worker are indistinguishable to the
// backend (and dedupable via the Idempotency-Key header).

import { LAMBDA_URL, TENANT_NAME } from "../generated/buildInfo.js";
import { getSessionId, microsecondTimestamp, collectBrowserInfo } from "./tracker.js";

export async function sendEventNow(eventType, eventName, eventValue = 1, data = {}, userId = "") {
  if (!LAMBDA_URL) {
    throw new Error("sendEventNow: no VITE_LAMBDA_URL configured for this build");
  }
  const sessionId = getSessionId();
  const event = {
    event_type: eventType,
    event_name: eventName,
    event_value: eventValue,
    data: data || {},
    user_id: userId || "",
    user_info: {},
    browser_info: collectBrowserInfo(),
    send_time: microsecondTimestamp(),
  };
  const res = await fetch(`${LAMBDA_URL}/add-events`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      tenant_name: TENANT_NAME,
      session_id: sessionId,
      "Idempotency-Key": `${sessionId}:now-${Date.now()}`,
    },
    body: JSON.stringify({ events: [event] }),
  });
  if (!res.ok) throw new Error(`sendEventNow: add-events failed (${res.status})`);
  return res.json().catch(() => ({}));
}

// Plan spelling.
export { sendEventNow as send_event_now };

// flushNow() — ask the service worker to drain the IndexedDB queue immediately
// instead of waiting for its 10s tick. Fire-and-forget; does not await delivery.
export async function flushNow() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: "FLUSH_NOW" });
  } catch {
    /* no controller yet — the next interval tick will catch up */
  }
}
