import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";

export default defineConfig({
  output: "static",
  site: process.env.ASTRO_SITE || "https://jonathan-aerts.dev",
  base: process.env.ASTRO_BASE || "/",
  integrations: [
    mdx(),
    sitemap({
      // Exclude the homepage which is just a meta-refresh redirect to /recruiter
      filter: (page) =>
        page !== "https://jonathan-aerts.dev/" && page !== "https://jonathan-aerts.dev",
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
