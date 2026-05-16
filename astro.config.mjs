import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";

// Production target: apex jonathan-aerts.dev (custom domain via public/CNAME).
// Override with ASTRO_SITE / ASTRO_BASE env vars to build for a preview target
// (e.g. GH Pages project URL: ASTRO_SITE=https://john6810.github.io ASTRO_BASE=/Astro/).
const SITE = process.env.ASTRO_SITE || "https://jonathan-aerts.dev";
const BASE = process.env.ASTRO_BASE || "/";

// Build timestamp injected as a compile-time constant. Format: "November 16, 2025"
// (en-US long form). Refreshed automatically on every `astro build` — i.e. every
// deploy via GitHub Actions on push to main.
const BUILD_DATE = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default defineConfig({
  output: "static",
  site: SITE,
  base: BASE,
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      wrap: true,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    define: {
      __BUILD_DATE__: JSON.stringify(BUILD_DATE),
    },
  },
});
