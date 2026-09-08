// Serverless data layer. Catalog + product JSON and product media are static
// files under public/storage/ (served at `${BASE_URL}storage/…`). Point
// VITE_STORAGE_BASE at a CDN later without touching callers.

const RAW_BASE =
  import.meta.env.VITE_STORAGE_BASE || `${import.meta.env.BASE_URL}storage`;
export const STORAGE_BASE = RAW_BASE.replace(/\/+$/, "");

export const PLACEHOLDER_IMAGE = `${STORAGE_BASE}/product_placeholder.webp`;

// mediaUrl("products_media/0_a1b2c3_1200x1200.webp") -> absolute URL.
// Passing an already-absolute URL or an empty value returns a safe result.
export function mediaUrl(path) {
  if (!path) return PLACEHOLDER_IMAGE;
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  return `${STORAGE_BASE}/${String(path).replace(/^\/+/, "")}`;
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
    catalogPromise = getJson(`${STORAGE_BASE}/catalog/catalog.json`).catch((err) => {
      catalogPromise = null; // let a later call retry
      throw err;
    });
  }
  return catalogPromise;
}

// PDP: fetch products/<id>.json directly. Sample ids are equal to the slug used
// in the route, so no catalog round-trip is needed to open a product.
export function fetchProduct(id) {
  return getJson(`${STORAGE_BASE}/products/${encodeURIComponent(id)}.json`);
}
