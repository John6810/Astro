// Routing & locale-negotiation unit tests for worker/index.ts.
//
// SELF.fetch invokes the real Worker entry via @cloudflare/vitest-pool-workers,
// with the same ASSETS binding wrangler.jsonc declares. `dist/` must
// have been built before this suite runs (the `pnpm test` script does
// `astro build && vitest run`).

import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { __isHtmlContentType } from "../index";

const ORIGIN = "https://example.com";

async function fetchPath(
  path: string,
  init: { headers?: Record<string, string>; method?: string; redirect?: RequestRedirect } = {}
): Promise<Response> {
  return SELF.fetch(`${ORIGIN}${path}`, {
    method: init.method ?? "GET",
    headers: init.headers,
    redirect: init.redirect ?? "manual",
  });
}

describe("locale SSR routing", () => {
  it.each([
    { path: "/", lang: "en" },
    { path: "/fr/", lang: "fr" },
    { path: "/ja/", lang: "ja" },
  ])('$path serves <html lang="$lang">', async ({ path, lang }) => {
    const res = await fetchPath(path);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toMatch(new RegExp(`<html lang="${lang}"`));
  });

  it("hreflang alternates are emitted on /", async () => {
    const res = await fetchPath("/");
    const html = await res.text();
    expect(html).toContain('rel="alternate" hreflang="en"');
    expect(html).toContain('rel="alternate" hreflang="fr"');
    expect(html).toContain('rel="alternate" hreflang="ja"');
    expect(html).toContain('rel="alternate" hreflang="x-default"');
  });
});

describe("bot bypass", () => {
  it.each([
    "ClaudeBot/1.0",
    "ClaudeBot",
    "claudebot/1.2 (anthropic)",
    "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)",
    "Googlebot/2.1 (+http://www.google.com/bot.html)",
    "PerplexityBot/1.0",
  ])("UA %j on / → 200, no redirect", async (ua) => {
    const res = await fetchPath("/", {
      headers: { "User-Agent": ua, "Accept-Language": "fr-BE,fr;q=0.9" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("Accept-Language redirect", () => {
  it("fr-BE → 302 /fr/", async () => {
    const res = await fetchPath("/", { headers: { "Accept-Language": "fr-BE,fr;q=0.9,en;q=0.5" } });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/fr/`);
  });

  it("ja-JP → 302 /ja/", async () => {
    const res = await fetchPath("/", { headers: { "Accept-Language": "ja-JP,ja;q=0.9" } });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/ja/`);
  });

  it("en-US → 200 (no redirect)", async () => {
    const res = await fetchPath("/", { headers: { "Accept-Language": "en-US,en;q=0.9" } });
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("quality values: en-US;q=0.5,fr-BE;q=0.9 picks fr", async () => {
    const res = await fetchPath("/", { headers: { "Accept-Language": "en-US;q=0.5,fr-BE;q=0.9" } });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/fr/`);
  });

  it("unsupported tag → default locale (no redirect)", async () => {
    const res = await fetchPath("/", { headers: { "Accept-Language": "de-DE,de;q=0.9" } });
    expect(res.status).toBe(200);
  });

  it("missing Accept-Language → default locale (no redirect)", async () => {
    const res = await fetchPath("/");
    expect(res.status).toBe(200);
  });
});

describe("cookie override", () => {
  it("Cookie lang=fr with Accept-Language: en-US → 302 /fr/", async () => {
    const res = await fetchPath("/", {
      headers: { "Accept-Language": "en-US,en;q=0.9", Cookie: "lang=fr" },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/fr/`);
  });

  it("Cookie lang=ja overrides Accept-Language: fr-BE", async () => {
    const res = await fetchPath("/", {
      headers: { "Accept-Language": "fr-BE,fr;q=0.9", Cookie: "lang=ja" },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/ja/`);
  });

  it("Cookie lang=en (= default) stays on /", async () => {
    const res = await fetchPath("/", {
      headers: { "Accept-Language": "fr-BE,fr;q=0.9", Cookie: "lang=en" },
    });
    expect(res.status).toBe(200);
  });

  it("Cookie lang=xx (invalid) falls back to Accept-Language", async () => {
    const res = await fetchPath("/", {
      headers: { "Accept-Language": "fr-BE,fr;q=0.9", Cookie: "lang=xx" },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/fr/`);
  });

  it("Cookie among other cookies still matches", async () => {
    const res = await fetchPath("/", {
      headers: {
        "Accept-Language": "en-US",
        Cookie: "theme=dark; lang=ja; other=value",
      },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/ja/`);
  });
});

describe("static asset paths", () => {
  it("/favicon-32x32.png serves bytes (200)", async () => {
    const res = await fetchPath("/favicon-32x32.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("image/png");
  });

  it("/sitemap-index.xml serves XML (200)", async () => {
    const res = await fetchPath("/sitemap-index.xml");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("xml");
  });

  it("/llms.txt serves plain text (200)", async () => {
    const res = await fetchPath("/llms.txt");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
  });

  it("/index.md serves markdown (200)", async () => {
    const res = await fetchPath("/index.md");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");
  });
});

describe("404 handling", () => {
  it("unknown path → 404 with HTML body", async () => {
    const res = await fetchPath("/this-path-does-not-exist-3e5a9");
    expect(res.status).toBe(404);
    const html = await res.text();
    expect(html).toContain("Page not found");
    expect(html).toMatch(/<html lang="en"/);
  });
});

describe("sitemap covers all three locales", () => {
  it("sitemap-0.xml mentions /, /fr/, /ja/", async () => {
    const res = await fetchPath("/sitemap-0.xml");
    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toContain("<loc>https://jonathan-aerts.dev/</loc>");
    expect(xml).toContain("<loc>https://jonathan-aerts.dev/fr/</loc>");
    expect(xml).toContain("<loc>https://jonathan-aerts.dev/ja/</loc>");
  });
});

describe("HTML-only analytics filter (worker/index.ts __isHtmlContentType)", () => {
  // The Worker only emits an analytics datapoint when the response is
  // text/html. These tests verify the helper *and* exercise the
  // non-HTML branches via SELF.fetch to make sure non-HTML responses
  // really do flow through unchanged (status, content-type intact).
  //
  // Asserting the *absence* of writeDataPoint calls would require
  // a mocked ANALYTICS binding (not how the test pool is wired);
  // instead we trust the helper unit tests below and verify that
  // requests still succeed.
  //
  // Imported lazily so the test file doesn't pull in worker/index.ts
  // at module-load time — the pool already loads it via SELF.

  it("sitemap returns application/xml — analytics filter should skip it", async () => {
    const res = await fetchPath("/sitemap-index.xml");
    expect(res.status).toBe(200);
    const ct = res.headers.get("content-type") ?? "";
    // application/xml or text/xml — both should NOT match text/html
    expect(ct).toMatch(/xml/);
    expect(ct.toLowerCase().startsWith("text/html")).toBe(false);
  });

  it("robots.txt returns text/plain — analytics filter should skip it", async () => {
    const res = await fetchPath("/robots.txt");
    expect(res.status).toBe(200);
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    expect(ct.startsWith("text/html")).toBe(false);
  });

  it("rss.xml returns XML — analytics filter should skip it", async () => {
    const res = await fetchPath("/rss.xml");
    expect(res.status).toBe(200);
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    expect(ct.startsWith("text/html")).toBe(false);
  });

  it("/fr/ and /ja/ HTML pages remain text/html (analytics filter keeps them)", async () => {
    for (const path of ["/fr/", "/ja/"]) {
      const res = await fetchPath(path);
      expect(res.status).toBe(200);
      const ct = (res.headers.get("content-type") ?? "").toLowerCase();
      expect(ct.startsWith("text/html")).toBe(true);
    }
  });
});

describe("__isHtmlContentType helper", () => {
  function withContentType(ct: string | null): Response {
    return new Response("", {
      headers: ct === null ? undefined : { "content-type": ct },
    });
  }

  it.each<[string | null, boolean]>([
    ["text/html", true],
    ["text/html; charset=utf-8", true],
    ["TEXT/HTML", true], // case-insensitive
    ["text/html; charset=UTF-8", true],
    ["application/xhtml+xml", false], // close but not text/html
    ["application/xml", false],
    ["text/xml", false],
    ["text/plain", false],
    ["image/png", false],
    ["image/svg+xml", false], // SVG: skip
    ["application/json", false],
    ["application/javascript", false],
    ["text/css", false],
    [null, false], // missing header
    ["", false],
  ])("content-type %j -> %s", (ct, expected) => {
    expect(__isHtmlContentType(withContentType(ct))).toBe(expected);
  });
});

describe("JSON-LD Person identical across locales", () => {
  function extractJsonLd(html: string): unknown {
    const m = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
    if (!m) throw new Error("JSON-LD not found");
    return JSON.parse(m[1]);
  }

  it("/, /fr/ and /ja/ ship the same Person graph", async () => {
    const [en, fr, ja] = await Promise.all([
      fetchPath("/").then((r) => r.text()),
      fetchPath("/fr/").then((r) => r.text()),
      fetchPath("/ja/").then((r) => r.text()),
    ]);
    const enJson = extractJsonLd(en);
    const frJson = extractJsonLd(fr);
    const jaJson = extractJsonLd(ja);
    expect(frJson).toEqual(enJson);
    expect(jaJson).toEqual(enJson);
  });
});
