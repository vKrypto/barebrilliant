import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageVisit } from "../events/index.js";

// Fires page_visit on first render and on every client-side route change, so
// SPA navigations are counted the same as full loads. Timing does not matter
// here, so it goes through the deferred queue.
export default function RouteTracker() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    trackPageVisit(pathname);
  }, [pathname, search]);
  return null;
}
