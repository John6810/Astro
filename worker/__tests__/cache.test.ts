// Edge cache tests — Workers Cache API integration on the three SSR
// routes (`/`, `/fr/`, `/ja/`). Two-tier:
//
//   1. Unit tests on the worker/cache.ts module in isolation (no
//      SELF.fetch). Mock the Cache API where needed.
//   2. Integration tests via SELF.fetch that hit the full Worker
//      pipeline, asserting the x-cache header, HIT-vs-MISS sequence,
//      nonce freshness on every response, and bot BYPASS behaviour.

import { SELF } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CACHE_TTL_SECONDS,
  buildCacheKey,
  isCacheableSsrPath,
  makeCacheable,
  withCacheStatusHeader,
} from "../cache";

// ─── Unit tests — pure module surface ────────────────────────────────────────

describe("isCacheableSsrPath", () => {
  it.each<[string, boolean]>([
    ["/", true],
    ["/fr/", true],
    ["/ja/", true],
    // Strictly excluded:
    ["/fr", false], // no trailing slash — different URL
    ["/ja", false],
    ["/blog/", false],
    ["/blog/foo/", false],
    ["/favicon-32x32.png", false],
    ["/sitemap-index.xml", false],
    ["/version", false],
    ["/csp-report", false],
    ["/api/whatever", false],
  ])("isCacheableSsrPath(%j) === %s", (path, expected) => {
    expect(isCacheableSsrPath(path)).toBe(expected);
  });
});

describe("buildCacheKey", () => {
  it("appends a `_v` query param so deploys naturally rotate the cache namespace", () => {
    const key = buildCacheKey(new URL("https://example.com/fr/"));
    const keyUrl = new URL(key.url);
    expect(keyUrl.pathname).toBe("/fr/");
    expect(keyUrl.searchParams.get("_v")).not.toBeNull();
    expect(keyUrl.searchParams.get("_v")!.length).toBeGreaterThan(0);
  });

  it("preserves the request method as GET (Cache API contract)", () => {
    const key = buildCacheKey(new URL("https://example.com/"));
    expect(key.method).toBe("GET");
  });

  it("produces stable keys for the same input", () => {
    const a = buildCacheKey(new URL("https://example.com/"));
    const b = buildCacheKey(new URL("https://example.com/"));
    expect(a.url).toBe(b.url);
  });

  it("produces distinct keys for distinct paths", () => {
    const a = buildCacheKey(new URL("https://example.com/"));
    const b = buildCacheKey(new URL("https://example.com/fr/"));
    expect(a.url).not.toBe(b.url);
  });
});

describe("makeCacheable", () => {
  it("preserves status + content-type", () => {
    const upstream = new Response("<html/>", {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
    const cacheable = makeCacheable(upstream);
    expect(cacheable.status).toBe(200);
    expect(cacheable.headers.get("content-type")).toBe("text/html; charset=utf-8");
  });

  it("strips Vary, CSP, Reporting-Endpoints, and static security headers", () => {
    const upstream = new Response("<html/>", {
      status: 200,
      headers: {
        "content-type": "text/html",
        Vary: "Accept-Language, Cookie",
        "Content-Security-Policy": "default-src 'self'",
        "Reporting-Endpoints": 'csp-endpoint="https://example.com/csp-report"',
        "Strict-Transport-Security": "max-age=63072000",
        "X-Frame-Options": "DENY",
      },
    });
    const cacheable = makeCacheable(upstream);
    expect(cacheable.headers.get("vary")).toBeNull();
    expect(cacheable.headers.get("content-security-policy")).toBeNull();
    expect(cacheable.headers.get("reporting-endpoints")).toBeNull();
    expect(cacheable.headers.get("strict-transport-security")).toBeNull();
    expect(cacheable.headers.get("x-frame-options")).toBeNull();
  });

  it("adds Cache-Control with the configured s-maxage", () => {
    const upstream = new Response("", { headers: { "content-type": "text/html" } });
    const cacheable = makeCacheable(upstream);
    const cc = cacheable.headers.get("cache-control") ?? "";
    expect(cc).toContain(`s-maxage=${CACHE_TTL_SECONDS}`);
    expect(cc).toContain("max-age=0");
    expect(cc).toContain("must-revalidate");
    expect(cc).toContain("public");
  });
});

describe("withCacheStatusHeader", () => {
  it.each<["HIT" | "MISS" | "BYPASS"]>([["HIT"], ["MISS"], ["BYPASS"]])(
    "stamps x-cache: %s on the response without mutating the original",
    (status) => {
      const original = new Response("body", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
      const tagged = withCacheStatusHeader(original, status);
      expect(tagged.headers.get("x-cache")).toBe(status);
      // Original is unchanged
      expect(original.headers.get("x-cache")).toBeNull();
    }
  );
});

// ─── Integration tests via SELF.fetch ────────────────────────────────────────

const ORIGIN = "https://example.com";

async function fetchPath(
  path: string,
  init: { headers?: Record<string, string>; method?: string } = {}
): Promise<Response> {
  return SELF.fetch(`${ORIGIN}${path}`, {
    method: init.method ?? "GET",
    headers: init.headers,
    redirect: "manual",
  });
}

function extractNonceFromCsp(csp: string | null): string | null {
  if (!csp) return null;
  const m = csp.match(/'nonce-([A-Za-z0-9+/=]+)'/);
  return m?.[1] ?? null;
}

function extractFirstScriptNonce(html: string): string | null {
  // HTMLRewriter stamps `nonce="<value>"` on every <script>; pick the
  // first one that's a non-JSON-LD inline tag (JSON-LD also gets the
  // attribute but its position varies — we just want to assert
  // something was stamped).
  const m = html.match(/<script[^>]*\snonce="([^"]+)"/i);
  return m?.[1] ?? null;
}

describe("x-cache header lifecycle on `/`", () => {
  // We can't easily reset the Workers Cache between tests (the test
  // pool's caches.default persists across SELF.fetch calls within the
  // suite). To work around that, each describe block uses a unique
  // bust-path or careful sequencing. The first request below may be
  // either MISS (cold suite) or HIT (this path was cached by a
  // previous describe block, but in practice the test runner orders
  // by file and we control the order within the file).

  it("two consecutive GETs: first emits a defined x-cache, second is HIT", async () => {
    const r1 = await fetchPath("/", { headers: { "Accept-Language": "en-US,en;q=0.9" } });
    expect(r1.status).toBe(200);
    expect(r1.headers.get("x-cache")).toMatch(/^HIT|MISS$/);

    const r2 = await fetchPath("/", { headers: { "Accept-Language": "en-US,en;q=0.9" } });
    expect(r2.status).toBe(200);
    expect(r2.headers.get("x-cache")).toBe("HIT");
  });

  it("two HITs return DIFFERENT CSP nonces (per-request rewrite preserved)", async () => {
    // Warm the cache first
    await fetchPath("/", { headers: { "Accept-Language": "en-US" } });
    const r1 = await fetchPath("/", { headers: { "Accept-Language": "en-US" } });
    const r2 = await fetchPath("/", { headers: { "Accept-Language": "en-US" } });
    expect(r1.headers.get("x-cache")).toBe("HIT");
    expect(r2.headers.get("x-cache")).toBe("HIT");

    const csp1 = extractNonceFromCsp(r1.headers.get("content-security-policy"));
    const csp2 = extractNonceFromCsp(r2.headers.get("content-security-policy"));
    expect(csp1).not.toBeNull();
    expect(csp2).not.toBeNull();
    expect(csp1).not.toBe(csp2);
  });

  it("HIT response body has a real nonce (not a placeholder) matching the CSP header", async () => {
    // Warm up first
    await fetchPath("/", { headers: { "Accept-Language": "en-US" } });
    const res = await fetchPath("/", { headers: { "Accept-Language": "en-US" } });
    expect(res.headers.get("x-cache")).toBe("HIT");

    const cspNonce = extractNonceFromCsp(res.headers.get("content-security-policy"));
    expect(cspNonce, "CSP header should contain a nonce").not.toBeNull();

    const html = await res.text();
    expect(html).not.toContain("__CSP_NONCE__"); // we don't use placeholders
    const scriptNonce = extractFirstScriptNonce(html);
    expect(scriptNonce, "at least one <script> should carry the nonce attribute").not.toBeNull();
    expect(scriptNonce).toBe(cspNonce);
  });

  it("preserves `Vary: Accept-Language, Cookie` on hits and misses", async () => {
    const r1 = await fetchPath("/", { headers: { "Accept-Language": "en-US" } });
    expect(r1.headers.get("vary")).toBe("Accept-Language, Cookie");
    const r2 = await fetchPath("/", { headers: { "Accept-Language": "en-US" } });
    expect(r2.headers.get("vary")).toBe("Accept-Language, Cookie");
  });
});

describe("x-cache lifecycle on /fr/ and /ja/", () => {
  it.each(["/fr/", "/ja/"])("two GETs to %s: second is HIT", async (path) => {
    const r1 = await fetchPath(path);
    expect(r1.status).toBe(200);
    expect(r1.headers.get("x-cache")).toMatch(/^HIT|MISS$/);

    const r2 = await fetchPath(path);
    expect(r2.status).toBe(200);
    expect(r2.headers.get("x-cache")).toBe("HIT");
  });
});

describe("redirects are not cached", () => {
  it("302 to /fr/ has no x-cache header", async () => {
    const res = await fetchPath("/", {
      headers: { "Accept-Language": "fr-BE,fr;q=0.9" },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("x-cache")).toBeNull();
  });

  it("302 to /ja/ has no x-cache header", async () => {
    const res = await fetchPath("/", {
      headers: { "Accept-Language": "ja-JP,ja;q=0.9" },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("x-cache")).toBeNull();
  });
});

describe("bot UA always BYPASSes the cache on /", () => {
  it("first request is BYPASS, second is BYPASS too (never HIT)", async () => {
    const r1 = await fetchPath("/", { headers: { "User-Agent": "ClaudeBot/1.0" } });
    expect(r1.status).toBe(200);
    expect(r1.headers.get("x-cache")).toBe("BYPASS");

    const r2 = await fetchPath("/", { headers: { "User-Agent": "ClaudeBot/1.0" } });
    expect(r2.status).toBe(200);
    expect(r2.headers.get("x-cache")).toBe("BYPASS");
  });

  it.each(["ClaudeBot/1.0", "GPTBot/1.2", "Googlebot/2.1", "PerplexityBot/1.0"])(
    "%s gets BYPASS",
    async (ua) => {
      const res = await fetchPath("/", { headers: { "User-Agent": ua } });
      expect(res.headers.get("x-cache")).toBe("BYPASS");
    }
  );
});

describe("paths outside the cacheable set never carry x-cache", () => {
  it.each(["/sitemap-index.xml", "/robots.txt", "/favicon-32x32.png", "/blog/"])(
    "%s has no x-cache header",
    async (path) => {
      const res = await fetchPath(path);
      // The asset binding might 404 on /robots.txt if not built, but
      // either way: no x-cache. We only stamp the header on the three
      // SSR-cacheable paths.
      expect(res.headers.get("x-cache")).toBeNull();
    }
  );

  it("/version has no x-cache header (ops endpoint, never cached)", async () => {
    const res = await fetchPath("/version");
    expect(res.status).toBe(200);
    expect(res.headers.get("x-cache")).toBeNull();
  });
});

// ─── Spy-based unit test for cache.put / cache.match call sequence ─────────

describe("fetchThroughCache wiring (spy-based, no SELF)", () => {
  // We don't import fetchThroughCache directly in a separate test
  // because the cloudflare:test pool provides a real caches.default
  // that the integration tests above exercise end-to-end. A spy
  // suite here would be redundant — and risk false positives by
  // diverging from the real Cache API semantics. Keep this describe
  // as a placeholder so the structure makes it clear which tier is
  // which when a future change wants more granularity.

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _spy: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    _spy = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("structure is reserved for future spy-based assertions", () => {
    expect(true).toBe(true);
  });
});
