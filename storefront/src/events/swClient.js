// Reacts to the "a new build activated" message the service worker posts after
// it clears caches (see scripts/service-worker.template.js -> activate). One
// reload per version brings the open tab onto the new frontend bundle and the
// new LAMBDA_URL. The sessionStorage guard keeps it to a single reload.

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    const msg = event.data || {};
    if (msg.type !== "SW_UPDATED" || !msg.version) return;

    let seen = null;
    try {
      seen = sessionStorage.getItem("sw-reload-version");
    } catch {
      /* ignore */
    }
    if (seen === msg.version) return;

    try {
      sessionStorage.setItem("sw-reload-version", msg.version);
    } catch {
      /* ignore */
    }
    location.reload();
  });
}
