# Theme

## Part 1 — Token summary
- Fonts: serif "Playfair Display" 400 (all display sizes), sans "Inter" 400/500/600 (UI/body). Google Fonts.
- Light (default :root): bg #f4f1eb (cream), surface #e8e3da, raised #fbf9f4, text #2d2d2a, muted #73736e, hairline rgba(43,43,40,.14), accent gold-d #7c674a, CTA bg #1a1a18 / fg cream.
- Dark ([data-bb-theme="dark"], the hero identity): bg #0b0b0a, surface #141413, raised #21211f, text #ded8ce, muted #999890, hairline rgba(216,209,196,.16), accent gold-l #d5c1a2, CTA bg cream / fg ink.
- Gold #b79a72 only as hairline / eyebrow / micro-accent, never a fill. Teal #65706e, coral #9c6f63 (errors).
- Type scale: hero clamp(2.6rem,7vw,5.5rem)/1.05; h1 clamp(2.1rem,5vw,4.25rem); h2 clamp(1.8rem,3.6vw,3.25rem); h3 clamp(1.35rem,2.2vw,2.25rem); body-lg clamp(1.0625rem,1.4vw,1.25rem)/1.6; eyebrow 500 12px uppercase .2em tracking with a 6px rotated-square diamond bullet; lede italic serif.
- Buttons: uppercase Inter 600 13px, .12em tracking, radius 5px, min-height 44px; primary filled, secondary outline, tertiary text + arrow.
- Radius 5px / 8px. Gutter clamp(20px,5vw,70px). Max width 1240px. Measure 42rem. Section padding clamp(3.5rem,9vw,7rem).
- Motif: rotated-square diamond (.bb-diamond, eyebrow bullet).

## Part 2 — Raw sources

### `storefront/src/theme.css`

```css
/* Bare Brilliant design system.
   Source of truth: raw_plans/BARE BRILLIANT WEBSITE.pdf (Final Website Design,
   Content & Developer Specification) — it supersedes the April design_language_guide.

   Type  : Playfair Display (Regular 400 for all display sizes — "high contrast"
           = the typeface's stroke contrast, not weight) + Inter for UI/body.
   Colour: dark is the hero identity; light is the clarity companion for product,
           price, specification and education. Black / ivory / grey first;
           warm gold (#B79A72) only as a hairline / eyebrow / micro-accent —
           never a fill. The product image is always the brightest object. */

@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&display=swap");

:root {
  color-scheme: light;

  --bb-serif: "Playfair Display", Georgia, "Times New Roman", serif;
  --bb-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

  /* ---- palette (Brand Narrative exact hexes) ---- */
  --bb-ink: #0b0b0a; /* dark ground */
  --bb-ink-2: #141413; /* raised surface on dark */
  --bb-ink-3: #21211f; /* card on dark */
  --bb-cream: #f4f1eb; /* light ground */
  --bb-cream-2: #e8e3da; /* card on light */
  --bb-cream-3: #fbf9f4; /* raised / input surface on light */

  --bb-gold: #b79a72;
  --bb-gold-l: #d5c1a2; /* gold on dark */
  --bb-gold-d: #7c674a; /* gold on light */
  --bb-teal: #65706e;
  --bb-coral: #9c6f63; /* alerts / errors */

  --bb-tx-d: #2d2d2a; /* text on light */
  --bb-tx-dm: #73736e; /* muted on light */
  --bb-tx-l: #ded8ce; /* text on dark */
  --bb-tx-lm: #999890; /* muted on dark */

  --bb-line-d: rgba(43, 43, 40, 0.14); /* hairline on light */
  --bb-line-l: rgba(216, 209, 196, 0.16); /* hairline on dark */

  /* ---- semantic tokens: default = LIGHT theme ---- */
  --bb-bg: var(--bb-cream);
  --bb-surface: var(--bb-cream-2);
  --bb-raised: var(--bb-cream-3);
  --bb-text: var(--bb-tx-d);
  --bb-text-muted: var(--bb-tx-dm);
  --bb-line: var(--bb-line-d);
  --bb-accent: var(--bb-gold-d);
  --bb-cta-bg: #1a1a18; /* filled near-black on light */
  --bb-cta-fg: var(--bb-cream);
  --bb-cta-outline: rgba(43, 43, 40, 0.4);

  /* ---- radii / layout ---- */
  --bb-radius: 5px; /* cards 4–8px */
  --bb-radius-lg: 8px;
  --bb-gutter: clamp(20px, 5vw, 70px); /* 70 desktop · 48 tablet · 20 mobile */
  --bb-measure: 42rem; /* long reading copy 640–760px */
  --bb-maxw: 1240px;
  --bb-tap: 44px; /* min touch target */
}

/* Dark theme — one theme for the whole site, set on <html data-bb-theme> by src/lib/theme.js
   (system setting by default, or the footer toggle's saved choice). Light = the :root tokens above. */
[data-bb-theme="dark"] {
  color-scheme: dark; /* native controls + scrollbars follow the theme */
  --bb-bg: var(--bb-ink);
  --bb-surface: var(--bb-ink-2);
  --bb-raised: var(--bb-ink-3);
  --bb-text: var(--bb-tx-l);
  --bb-text-muted: var(--bb-tx-lm);
  --bb-line: var(--bb-line-l);
  --bb-accent: var(--bb-gold-l);
  --bb-cta-bg: var(--bb-cream); /* filled ivory on dark */
  --bb-cta-fg: var(--bb-ink);
  --bb-cta-outline: rgba(216, 209, 196, 0.4);
}

/* ============================ type scale ============================ */
.bb-eyebrow {
  font: 500 clamp(10.5px, 1.4vw, 12px) / 1 var(--bb-sans);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--bb-accent);
  display: inline-flex;
  align-items: center;
  gap: 0.6em;
}
.bb-eyebrow::before {
  content: "";
  width: 6px;
  height: 6px;
  background: var(--bb-accent);
  transform: rotate(45deg);
  flex: none;
}
.bb-eyebrow--plain::before {
  display: none;
}

.bb-hero-type {
  font: 400 clamp(2.6rem, 7vw, 5.5rem) / 1.05 var(--bb-serif);
  letter-spacing: -0.015em;
  color: var(--bb-text);
  margin: 0;
  text-wrap: balance;
}
h1,
.bb-h1 {
  font: 400 clamp(2.1rem, 5vw, 4.25rem) / 1.08 var(--bb-serif);
  letter-spacing: -0.014em;
  color: var(--bb-text);
  margin: 0;
  text-wrap: balance;
}
h2,
.bb-h2 {
  font: 400 clamp(1.8rem, 3.6vw, 3.25rem) / 1.12 var(--bb-serif);
  letter-spacing: -0.01em;
  color: var(--bb-text);
  margin: 0;
  text-wrap: balance;
}
h3,
.bb-h3 {
  font: 400 clamp(1.35rem, 2.2vw, 2.25rem) / 1.2 var(--bb-serif);
  letter-spacing: -0.005em;
  color: var(--bb-text);
  margin: 0;
}
.bb-body-lg {
  font: 400 clamp(1.0625rem, 1.4vw, 1.25rem) / 1.6 var(--bb-sans);
  color: var(--bb-text-muted);
  max-width: var(--bb-measure);
}
.bb-body {
  font: 400 1rem/1.65 var(--bb-sans);
  color: var(--bb-text-muted);
  max-width: var(--bb-measure);
}
.bb-lede {
  font: italic 400 clamp(1.05rem, 1.6vw, 1.3rem) / 1.55 var(--bb-serif);
  color: var(--bb-text-muted);
}

/* ============================ controls ============================ */
.bb-btn {
  --_fg: var(--bb-cta-fg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  min-height: var(--bb-tap);
  padding: 0.85rem 1.6rem;
  font: 600 0.8125rem/1 var(--bb-sans);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-decoration: none;
  border-radius: var(--bb-radius);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease, opacity 0.16s ease;
}
.bb-btn--primary {
  background: var(--bb-cta-bg);
  color: var(--bb-cta-fg);
  border-color: var(--bb-cta-bg);
}
.bb-btn--primary:hover {
  opacity: 0.88;
}
.bb-btn--secondary {
  background: transparent;
  color: var(--bb-text);
  border-color: var(--bb-cta-outline);
}
.bb-btn--secondary:hover {
  border-color: var(--bb-text);
}
.bb-btn--tertiary {
  min-height: 0;
  padding: 0.35rem 0;
  background: none;
  border: none;
  border-radius: 0;
  color: var(--bb-text);
  letter-spacing: 0.1em;
}
.bb-btn--tertiary::after {
  content: "\2192";
  transition: transform 0.16s ease;
}
.bb-btn--tertiary:hover::after {
  transform: translateX(3px);
}
.bb-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.bb-btn--block {
  width: 100%;
}

/* ============================ scaffolding ============================ */
.bb-container {
  width: 100%;
  max-width: var(--bb-maxw);
  margin-inline: auto;
  padding-inline: var(--bb-gutter);
}
.bb-section {
  padding-block: clamp(3.5rem, 9vw, 7rem);
}
.bb-card {
  background: var(--bb-surface);
  border: 1px solid var(--bb-line);
  border-radius: var(--bb-radius);
  padding: clamp(1.1rem, 2.4vw, 1.6rem);
}
.bb-hairline {
  border: 0;
  border-top: 1px solid var(--bb-line);
  margin: 0;
}
.bb-diamond {
  width: 0.7em;
  height: 0.7em;
  border: 1px solid currentColor;
  transform: rotate(45deg);
  display: inline-block;
  flex: none;
}

/* ==================== shared form primitives ==================== */
.bb-input {
  width: 100%;
  min-height: var(--bb-tap);
  padding: 0.7rem 0.9rem;
  font: 400 0.95rem/1.3 var(--bb-sans);
  color: var(--bb-text);
  background: var(--bb-raised);
  border: 1px solid var(--bb-line);
  border-radius: var(--bb-radius);
}
select.bb-input {
  cursor: pointer;
}
.bb-input:focus {
  outline: none;
  border-color: var(--bb-text-muted);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--bb-accent) 35%, transparent);
}
.bb-input[aria-invalid="true"] {
  border-color: var(--bb-coral);
}

.bb-field {
  display: grid;
  gap: 0.4rem;
}
.bb-field > label span,
.bb-field > span > span {
  font: 600 0.68rem/1 var(--bb-sans);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--bb-text-muted);
}
.bb-field__err {
  font: 500 0.78rem/1.4 var(--bb-sans);
  font-style: normal;
  color: var(--bb-coral);
}

.bb-chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0.35rem 0.8rem;
  font: 500 0.78rem/1 var(--bb-sans);
  letter-spacing: 0.02em;
  color: var(--bb-text-muted);
  border: 1px solid var(--bb-line);
  border-radius: 999px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}
.bb-chip:hover {
  color: var(--bb-text);
}
.bb-chip input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.bb-chip[data-on="true"] {
  color: var(--bb-text);
  border-color: var(--bb-text);
  background: color-mix(in srgb, var(--bb-text) 8%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

### `storefront/src/index.css`

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
}

html,
body,
#root {
  min-height: 100%;
}

body {
  margin: 0;
  font-family: var(--bb-sans);
  font-size: 16px;
  color: var(--bb-text);
  background: var(--bb-bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}

a {
  color: inherit;
}

img,
picture,
svg {
  max-width: 100%;
  display: block;
}

ul,
ol {
  list-style: none;
  margin: 0;
  padding: 0;
}

:focus-visible {
  outline: 2px solid var(--bb-accent);
  outline-offset: 2px;
}

.bb-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### `storefront/src/lib/theme.js`

```js
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
```
