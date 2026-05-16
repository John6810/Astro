import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";

const SITE = process.env.ASTRO_SITE || "https://john6810.github.io";
const BASE = process.env.ASTRO_BASE || "/Astro/";

export default defineConfig({
  output: "static",
  site: SITE,
  base: BASE,
  integrations: [
    mdx(),
    sitemap({
      // Exclude the homepage which is just a meta-refresh redirect to /recruiter
      filter: (page) => {
        const root = `${SITE}${BASE}`.replace(/\/+$/, "/");
        return page !== root && page !== root.replace(/\/$/, "");
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      wrap: true,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
