// Coherence test between worker/index.ts (bot bypass list) and
// public/robots.txt (Allow blocks per bot). The two need to stay
// in sync; if a bot is added to the Worker's BOT_UA regex without
// a corresponding `User-agent: <bot>` + `Allow: /` block in
// robots.txt, the crawl behaviour and the indexability claim drift
// apart. This test prevents that drift.
//
// Also asserts the inverse: every path the Worker handles specially
// as an ops endpoint (`/csp-report`, `/version`) is `Disallow`'d.
//
// Implementation note: this file runs inside the workerd runtime
// (via @cloudflare/vitest-pool-workers) where `node:fs` is not
// available. We inline both files at build time via Vite's `?raw`
// import suffix — the transform happens before the test reaches
// workerd, so the test sees the file contents as plain strings.

// Use Vite's `?raw` query to inline the file contents at transform
// time. The path is relative to this test file.
import robotsTxt from "../../public/robots.txt?raw";
import workerSrc from "../index.ts?raw";
import { describe, expect, it } from "vitest";

// The four bots whose `User-agent: <name>` block must be present in
// robots.txt. These are the AI crawlers + Googlebot — i.e. the
// subset of the Worker's bypass regex we explicitly want indexing
// the EN body. The Worker actually bypasses MORE bots than this (e.g.
// Bingbot, Twitterbot, facebookexternalhit) — those don't need
// explicit Allow blocks because the default `User-agent: *` already
// allows them; the explicit blocks here are about being noisy on
// purpose for the high-value crawlers.
const REQUIRED_ROBOTS_BOTS = ["ClaudeBot", "GPTBot", "PerplexityBot", "Googlebot"] as const;

// Paths the Worker handles outside the normal asset pipeline and
// shouldn't be indexed.
const REQUIRED_DISALLOW_PATHS = ["/csp-report", "/version", "/api/"] as const;

describe("robots.txt ↔ worker/index.ts coherence", () => {
  describe("required bots are explicitly Allow:'d in robots.txt", () => {
    it.each(REQUIRED_ROBOTS_BOTS)("robots.txt has a `User-agent: %s` + `Allow: /` block", (bot) => {
      // The block can be formatted across multiple lines (User-agent
      // line, then Allow line). We assert both are present in close
      // proximity by splitting around the User-agent line and looking
      // ahead.
      const re = new RegExp(`^User-agent:\\s*${bot}\\b`, "im");
      const match = robotsTxt.match(re);
      expect(match, `missing User-agent: ${bot} block in robots.txt`).not.toBeNull();

      const afterIdx = robotsTxt.indexOf(match![0]) + match![0].length;
      const lookahead = robotsTxt.slice(afterIdx, afterIdx + 200);
      expect(
        lookahead,
        `User-agent: ${bot} block missing 'Allow: /' within the next 200 chars`
      ).toMatch(/^\s*Allow:\s*\//m);
    });

    it.each(REQUIRED_ROBOTS_BOTS)("worker BOT_UA regex matches %s", (bot) => {
      // Pull the BOT_UA regex source from the inlined worker/index.ts.
      // The actual regex literal lives on a single line in the source.
      const match = workerSrc.match(/const BOT_UA\s*=\s*(\/.*?\/[a-z]*)/);
      expect(match, "could not locate BOT_UA literal in worker/index.ts").not.toBeNull();
      const literal = match![1];
      const lastSlash = literal.lastIndexOf("/");
      const pattern = literal.slice(1, lastSlash);
      const flags = literal.slice(lastSlash + 1) || "i";
      const regex = new RegExp(pattern, flags);
      expect(regex.test(`${bot}/1.0`), `BOT_UA does not match ${bot}`).toBe(true);
    });
  });

  describe("ops endpoints are Disallow'd in the default `User-agent: *` block", () => {
    it.each(REQUIRED_DISALLOW_PATHS)("Disallow: %s present", (path) => {
      // Escape regex metachars in the path so e.g. `/api/` doesn't
      // pattern-match unexpectedly.
      const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`^Disallow:\\s*${escaped}\\s*$`, "im");
      expect(robotsTxt, `expected Disallow: ${path} in robots.txt`).toMatch(re);
    });

    it("default `User-agent: *` block exists and precedes the Disallow lines", () => {
      const userAgentStarIdx = robotsTxt.search(/^User-agent:\s*\*/im);
      expect(userAgentStarIdx, "missing `User-agent: *` block").toBeGreaterThanOrEqual(0);
      const firstDisallowIdx = robotsTxt.search(/^Disallow:/im);
      expect(firstDisallowIdx).toBeGreaterThan(userAgentStarIdx);
    });
  });

  describe("sitemap directive", () => {
    it("declares an absolute sitemap URL", () => {
      expect(robotsTxt).toMatch(
        /^Sitemap:\s*https:\/\/jonathan-aerts\.dev\/sitemap[-_].*\.xml\s*$/im
      );
    });

    it("references a sitemap that the build emits", () => {
      // @astrojs/sitemap produces either `sitemap-index.xml` (index)
      // or `sitemap-0.xml` (single-file). robots.txt should point at
      // one of those forms.
      const sitemapLine = robotsTxt.match(/^Sitemap:\s*(\S+)\s*$/im);
      expect(sitemapLine).not.toBeNull();
      const url = sitemapLine![1];
      expect(url).toMatch(/\/sitemap-(index|0)\.xml$/);
    });
  });
});
