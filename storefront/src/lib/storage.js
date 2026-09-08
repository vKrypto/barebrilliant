// Serverless data layer. Two independent bases so JSON and media can move to
// different hosts (a static server / CDN) later without touching callers:
//
//   VITE_CATALOG_BASE  catalog.json + products/<id>.json   (PDP + catalog)
//   VITE_MEDIA_BASE     products_media/* + product_placeholder.webp
//
// Each falls back to VITE_STORAGE_BASE, then to the bundled `${BASE_URL}storage`.
// A cross-origin host must send Access-Control-Allow-Origin for the JSON fetches
// (images load without CORS).

const trimSlash = (u) => String(u).replace(/\/+$/, "");
const BUNDLED = `${import.meta.env.BASE_URL}storage`;
const SHARED = import.meta.env.VITE_STORAGE_BASE || BUNDLED;

export const DATA_BASE = trimSlash(import.meta.env.VITE_CATALOG_BASE || SHARED);
export const MEDIA_BASE = trimSlash(import.meta.env.VITE_MEDIA_BASE || SHARED);

export const PLACEHOLDER_IMAGE = `${MEDIA_BASE}/product_placeholder.webp`;

// mediaUrl("products_media/0_a1b2c3_1200x1200.webp") -> absolute URL under
// MEDIA_BASE. An already-absolute URL or an empty value returns a safe result.
export function mediaUrl(path) {
  if (!path) return PLACEHOLDER_IMAGE;
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  return `${MEDIA_BASE}/${String(path).replace(/^\/+/, "")}`;
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

let catalogPromise = null;
// Fetched once per session; catalog search + filter + sort all run client-side.
export function fetchCatalog() {
  if (!catalogPromise) {
    catalogPromise = getJson(`${DATA_BASE}/catalog/catalog.json`).catch((err) => {
      catalogPromise = null; // let a later call retry
      throw err;
    });
  }
  return catalogPromise;
}

// PDP: fetch products/<id>.json directly. Sample ids are equal to the slug used
// in the route, so no catalog round-trip is needed to open a product.
export function fetchProduct(id) {
  return getJson(`${DATA_BASE}/products/${encodeURIComponent(id)}.json`);
}
