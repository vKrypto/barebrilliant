import { STUBS } from "../content/stubs.js";

// dark = emotion / story / immersive ; light = product / price / spec / education
// (spec §Apple-Inspired Design Language: "Theme transitions are intentional").
const DARK = new Set([
  "/",
  "/chat",
  "/thank-you",
  "/order-confirmed",
]);

export function routeTheme(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (DARK.has(path)) return "dark";
  if (STUBS[path]?.theme) return STUBS[path].theme;
  return "light";
}
