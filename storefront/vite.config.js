import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// `base` matters for GitHub Pages project sites, where the app is served from
// https://<owner>.github.io/<repo>/ . The deploy workflow passes VITE_BASE=/<repo>/;
// locally it defaults to "/". import.meta.env.BASE_URL (used by the router and
// the service-worker registration) is derived from this.
export default defineConfig({
  base: process.env.VITE_BASE || "/",
  server: {
    host: true,
    port: 8080,
  },
  plugins: [react()],
});
