# Bare Brilliant — lead capture

Interactive lead form for a jewellery brand: **React (Vite)** on the client, **Express** on the server, optional **Cloud Firestore** for persistence. The UI follows the Bare Brilliant design language: dark editorial shell, warm ivory and platinum accents, Playfair Display + Manrope, and a cream form surface for conversion.

## Development

1. **Install dependencies** (in two terminals or sequentially):

   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

2. **Start the API** (default: `http://localhost:5001`):

   ```bash
   cd server && cp .env.example .env
   # Edit .env: optional Firestore (see below). Leads are always appended to a local **JSONL file** (`data/leads.jsonl` by default) and an in-memory buffer; with Firebase configured they are also written to Firestore.
   npm run dev
   ```

3. **Start the client** (Vite dev server proxies `/api` to the API):

   ```bash
   cd client && npm run dev
   ```

4. Open the URL Vite prints (e.g. `http://localhost:5173`).

## Behaviour

- Form fields: **name**, **country + phone**, **budget** (INR ranges), optional **diamonds** (no preference, natural, lab-grown).
- On success: the lead is written **(1)** appended as one line to `server/data/leads.jsonl` (or `LEADS_FILE`), **(2)** pushed to an in-memory array, and **(3)** to **Firestore** when configured. Then the app shows **`/thank-you`**. An **optional** “say hello in chat” link to WhatsApp **+91 73554 37836** is on that page only; nothing opens automatically.

## Production build

```bash
cd client && npm run build
```

Serve `client/dist` with any static host and run the server with `CORS_ORIGIN` set to your site origin. In development, Vite proxies `/api` to the Express port (see `client/vite.config.js` via `VITE_API_PROXY_TARGET`). If the API is on another origin in production, build the client with e.g. `VITE_API_BASE=https://api.example.com` so `client/src/api/submitLead.js` calls that base URL.

## Cloudflare Pages

**Frontend (this repo’s `client/` Vite app)** can live on [Cloudflare Pages](https://developers.cloudflare.com/pages). The Express `server/` is **Node** and is **not** run by Pages; host the API on any Node host (Railway, Render, Fly.io, a VPS, etc.) and point the built client at it.

**Dashboard (Git):**

1. **Create a project** → Connect your repository.
2. **Build configuration**  
   - **Root directory (advanced):** `client` (if the repo is this monorepo).  
   - **Build command:** `npm run build`  
   - **Build output directory:** `dist`  
3. **Environment variables** (Production and Preview) — *required for API calls*  
   - `VITE_API_BASE` = `https://your-api.example.com` (no trailing slash). This is baked in at build time, so set it before the first build or trigger a new deploy after changing it.
4. Deploy. Pages will use `client/wrangler.toml` only if you also use Wrangler from that folder; the dashboard build settings are enough without it.

**CLI from `client/` (optional):** install [`wrangler`](https://developers.cloudflare.com/workers/wrangler), then `npm run pages:deploy` (or `npx wrangler@latest pages deploy dist --project-name your-project-name`).

**Files added for Cloudflare:** `client/public/_redirects` (SPA routing), `client/public/_headers` (caching and simple security headers; copied to `dist/` on build), `client/wrangler.toml`, and `client/.env.production.example`. On the **API**, set `CORS_ORIGIN` to your Pages URL (`https://*.pages.dev` or your custom domain).

## Firestore

Create a `leads` collection (implicit on first write). The server uses a service account with Firestore read/write. Ensure the Firebase project has Firestore enabled and security rules that **deny** client direct access; only the server should use the admin SDK.

---

The lead page uses a full-bleed background image (`client/public/hero-jewelry.jpg`, currently a Pexels diamond ring shot) with dark ink-style gradients in `index.css` so type stays legible. Swap the file to your own low-light ring or lifestyle photography to match the brand guide.

Brand reference: `nBare_Brilliant_Design_Language_Guide_v2.pdf` in the repo root. Task spec: `tasks.log`.
