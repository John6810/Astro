import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Production target: apex jonathan-aerts.dev (custom domain via public/CNAME).
// Override with ASTRO_SITE / ASTRO_BASE env vars to build for a preview target
// (e.g. GH Pages project URL: ASTRO_SITE=https://john6810.github.io ASTRO_BASE=/Astro/).
const SITE = process.env.ASTRO_SITE || "https://jonathan-aerts.dev";
const BASE = process.env.ASTRO_BASE || "/";

// @astrojs/sitemap only emits HTML routes by default; our agent-facing markdown
// endpoints (src/pages/*.md.ts) are API routes, so they need to be declared as
// customPages. Enumerate blog slugs from the filesystem (content collection
// types aren't available at config-load time) and skip drafts via frontmatter.
function listBlogSlugs() {
  const dir = "./src/content/blog";
  try {
    return readdirSync(dir)
      .filter((f) => /\.(md|mdx)$/.test(f))
      .filter((f) => {
        const fm = readFileSync(join(dir, f), "utf-8").match(/^---\n([\s\S]*?)\n---/);
        return !fm || !/^\s*draft:\s*true\s*$/m.test(fm[1]);
      })
      .map((f) => f.replace(/\.(md|mdx)$/, ""));
  } catch {
    return [];
  }
}
const baseUrl = `${SITE.replace(/\/+$/, "")}${BASE.endsWith("/") ? BASE : `${BASE}/`}`;
const mdCustomPages = [
  `${baseUrl}index.md`,
  `${baseUrl}blog/index.md`,
  ...listBlogSlugs().map((slug) => `${baseUrl}blog/${slug}.md`),
];

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
  // Built-in i18n routing. EN serves at /, FR at /fr/, JA at /ja/.
  // - prefixDefaultLocale: false  -> default locale (EN) lives at root, not /en/
  // - redirectToDefaultLocale: false -> we handle Accept-Language redirects in
  //   the Cloudflare Worker (worker/index.ts) so bots and explicit visitors of
  //   `/` get EN deterministically.
  // - fallback: if a localized page is missing, fall back to EN content.
  i18n: {
    defaultLocale: "en",
    locales: ["en", "fr", "ja"],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
    fallback: { fr: "en", ja: "en" },
  },
  integrations: [
    mdx(),
    sitemap({
      // Emit per-locale URLs + xhtml:link rel="alternate" hreflang annotations.
      // Locale tags are BCP-47 for the sitemap (en-US / fr-BE / ja-JP); Astro's
      // i18n config above stays with the short codes used in URLs.
      i18n: {
        defaultLocale: "en",
        locales: { en: "en-US", fr: "fr-BE", ja: "ja-JP" },
      },
      customPages: mdCustomPages,
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
    define: {
      __BUILD_DATE__: JSON.stringify(BUILD_DATE),
    },
  },
});
