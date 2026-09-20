// Theme rules (src/lib/theme.js) with mocked browser globals. Run:  node scripts/theme.test.mjs
//
// Verifies: no saved choice -> follows the system (and re-follows it live); the toggle stores an
// explicit choice that beats the system, survives a reload, and is shared with other tabs; blocked
// storage still toggles for the visit; <meta theme-color> tracks the chosen theme.

import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const modulePath = resolve(dirname(fileURLToPath(import.meta.url)), "../src/lib/theme.js");
let caseNo = 0;

// A fresh module instance + fresh fake browser for every case.
async function browser({ systemDark = false, stored = null, storageBlocked = false } = {}) {
  const store = new Map(stored ? [["bb-theme", stored]] : []);
  const attrs = {};
  const metas = [
    { name: "theme-color", content: "#0b0b0a", media: "(prefers-color-scheme: dark)", removeAttribute(a) { delete this[a]; }, remove() { metas.splice(metas.indexOf(this), 1); } },
    { name: "theme-color", content: "#f4f1eb", media: "(prefers-color-scheme: light)", removeAttribute(a) { delete this[a]; }, remove() { metas.splice(metas.indexOf(this), 1); } },
  ];
  const mql = { matches: systemDark, handlers: [], addEventListener(_, fn) { this.handlers.push(fn); } };
  const windowHandlers = {};
  globalThis.localStorage = {
    getItem: (k) => { if (storageBlocked) throw new Error("blocked"); return store.has(k) ? store.get(k) : null; },
    setItem: (k, v) => { if (storageBlocked) throw new Error("blocked"); store.set(k, v); },
  };
  globalThis.matchMedia = () => mql;
  globalThis.addEventListener = (type, fn) => (windowHandlers[type] = fn);
  globalThis.document = {
    documentElement: { setAttribute: (k, v) => (attrs[k] = v), getAttribute: (k) => attrs[k] },
    querySelectorAll: () => metas.slice(),
    createElement: () => ({}),
    head: { appendChild: () => {} },
  };
  const theme = await import(pathToFileURL(modulePath).href + `?case=${++caseNo}`);
  return {
    theme, store, attrs, metas,
    html: () => attrs["data-bb-theme"],
    system(dark) { mql.matches = dark; mql.handlers.forEach((fn) => fn()); },
    otherTab(value) { if (value === null) store.delete("bb-theme"); else store.set("bb-theme", value); windowHandlers.storage?.({ key: "bb-theme" }); },
  };
}

// 1. pure rule
{
  const { theme } = await browser();
  assert.equal(theme.resolveTheme(null, true), "dark");
  assert.equal(theme.resolveTheme(null, false), "light");
  assert.equal(theme.resolveTheme("light", true), "light", "explicit light beats a dark system");
  assert.equal(theme.resolveTheme("dark", false), "dark", "explicit dark beats a light system");
  assert.equal(theme.resolveTheme("purple", true), "dark", "garbage in storage is ignored");
}

// 2. default follows the system, live
{
  const b = await browser({ systemDark: true });
  b.theme.initTheme();
  assert.equal(b.html(), "dark", "dark system -> dark site by default");
  b.system(false);
  assert.equal(b.html(), "light", "system flips -> site follows while no choice is saved");
  b.system(true);
  assert.equal(b.html(), "dark");
  assert.equal(b.store.has("bb-theme"), false, "following the system never writes a choice");
}

// 3. the toggle stores a choice that beats the system, and persists
{
  const b = await browser({ systemDark: true });
  b.theme.initTheme();
  b.theme.toggleTheme();
  assert.equal(b.html(), "light");
  assert.equal(b.store.get("bb-theme"), "light");
  b.system(false); b.system(true);
  assert.equal(b.html(), "light", "an explicit choice ignores later system changes");
  b.theme.toggleTheme();
  assert.equal(b.html(), "dark");
  assert.equal(b.store.get("bb-theme"), "dark");
}

// 4. a reload (new module instance, same storage) restores the choice over the system
{
  const b = await browser({ systemDark: false, stored: "dark" });
  b.theme.initTheme();
  assert.equal(b.html(), "dark");
  assert.equal(b.theme.currentTheme(), "dark");
}

// 5. another tab changes the choice
{
  const b = await browser({ systemDark: false });
  b.theme.initTheme();
  assert.equal(b.html(), "light");
  b.otherTab("dark");
  assert.equal(b.html(), "dark", "storage event from another tab applies");
  b.otherTab(null);
  assert.equal(b.html(), "light", "choice cleared elsewhere -> back to following the system");
}

// 6. blocked storage (private mode): the toggle still works for this visit
{
  const b = await browser({ systemDark: false, storageBlocked: true });
  b.theme.initTheme();
  assert.equal(b.html(), "light");
  b.theme.toggleTheme();
  assert.equal(b.html(), "dark", "toggle works without storage");
  b.theme.toggleTheme();
  assert.equal(b.html(), "light");
}

// 7. browser chrome colour tracks the theme (one meta, no OS-media variants left)
{
  const b = await browser({ systemDark: true });
  b.theme.initTheme();
  assert.equal(b.metas.length, 1, "the two media-scoped metas collapse into one");
  assert.equal(b.metas[0].content, "#0b0b0a");
  assert.equal("media" in b.metas[0], false);
  b.theme.toggleTheme();
  assert.equal(b.metas[0].content, "#f4f1eb");
}

// 8. setTheme ignores junk
{
  const b = await browser({ systemDark: false });
  b.theme.initTheme();
  b.theme.setTheme("sepia");
  assert.equal(b.html(), "light");
  assert.equal(b.store.has("bb-theme"), false);
}

console.log("theme: all checks passed");
