import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Reset scroll on route change (but not on hash-only navigation, which the
// browser handles for in-page anchors).
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}
