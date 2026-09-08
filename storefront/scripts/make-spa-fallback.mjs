// GitHub Pages has no SPA rewrite rule: a hard load of /chat or /thank-you
// would 404. Copying the built index.html to 404.html makes Pages serve the
// app shell for any unknown path; BrowserRouter then renders the route from
// window.location. (The response carries a 404 status, which browsers ignore
// for a full HTML document — fine for a client-rendered app.)

import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "dist/index.html");
const dest = resolve(root, "dist/404.html");

if (!existsSync(src)) {
  console.error("[make-spa-fallback] dist/index.html not found — run `vite build` first");
  process.exit(1);
}
copyFileSync(src, dest);
console.log("[make-spa-fallback] wrote dist/404.html");
