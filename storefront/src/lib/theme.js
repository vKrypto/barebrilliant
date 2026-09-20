// One theme for the whole storefront — light or dark, never per page.
//
//   default        the visitor's system setting (prefers-color-scheme), followed live
//   footer toggle  stores an explicit choice ("light" | "dark") in localStorage
//
// The theme lives on <html data-bb-theme>; theme.css turns it into tokens. index.html runs
// the same resolution before first paint so there is no flash — keep the two in step.

import { useSyncExternalStore } from "react";

export const THEME_KEY = "bb-theme";
const THEME_COLOR = { light: "#f4f1eb", dark: "#0b0b0a" }; // browser chrome / status bar

const isTheme = (value) => value === "light" || value === "dark";

/** The explicit choice wins; with none, follow the system. */
export function resolveTheme(choice, systemIsDark) {
  if (isTheme(choice)) return choice;
  return systemIsDark ? "dark" : "light";
}

let choice = null; // "light" | "dark" | null (= follow the system); memory first, storage as persistence
let loaded = false;

function readStoredChoice() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null; // storage blocked (private mode): the choice then lasts for this visit only
  }
}

function systemQuery() {
  return typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
}

export function currentTheme() {
  if (!loaded) {
    choice = readStoredChoice();
    loaded = true;
  }
  return resolveTheme(choice, Boolean(systemQuery()?.matches));
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-bb-theme", theme);
  // The static <meta theme-color> pair follows the OS; make it follow the chosen theme instead.
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  if (!metas.length) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
    meta.content = THEME_COLOR[theme];
    return;
  }
  metas.forEach((meta, index) => {
    if (index) return meta.remove();
    meta.removeAttribute("media");
    meta.content = THEME_COLOR[theme];
  });
}

const listeners = new Set();

function sync() {
  applyTheme(currentTheme());
  listeners.forEach((listener) => listener());
}

export function setTheme(theme) {
  if (!isTheme(theme)) return;
  choice = theme;
  loaded = true;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* not persisted */
  }
  sync();
}

export function toggleTheme() {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
}

let started = false;

/** Apply the theme and keep it in step with the system setting and with other tabs. Call once at startup. */
export function initTheme() {
  if (started) return;
  started = true;
  sync();
  const query = systemQuery();
  if (query) (query.addEventListener ? query.addEventListener("change", sync) : query.addListener?.(sync));
  addEventListener("storage", (event) => {
    if (event.key !== THEME_KEY && event.key !== null) return;
    choice = readStoredChoice();
    sync();
  });
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light");
  return { theme, toggle: toggleTheme };
}
