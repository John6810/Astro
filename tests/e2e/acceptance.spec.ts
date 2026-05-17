// E2E acceptance suite — one test per AC #1–#14, named exactly
// `AC{n}: …`. Runs against PREVIEW_URL (Cloudflare Workers Builds
// preview URL set per-PR) in both Chromium and Firefox.
//
// Tests are split into three groups by the kind of assertion they
// make: HTTP-level (request.fetch), DOM-level (page.goto + evaluate),
// and runtime-level (console listeners during page lifecycle).

import { test, expect, type Page, type APIResponse } from "@playwright/test";

const SEVEN_HEADERS = [
  "strict-transport-security",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "x-frame-options",
  "cross-origin-opener-policy",
  "content-security-policy",
] as const;

const SIX_STATIC_HEADERS = SEVEN_HEADERS.slice(0, 6) as readonly string[];

function expectAllHeaders(response: APIResponse, list: readonly string[]) {
  for (const h of list) {
    expect(response.headers()[h], `expected header ${h}`).toBeDefined();
  }
}

function expectNoHeader(response: APIResponse, header: string) {
  expect(response.headers()[header], `expected NO ${header}`).toBeUndefined();
}

function extractNonceFromCsp(csp: string | undefined): string | null {
  if (!csp) return null;
  const m = csp.match(/'nonce-([A-Za-z0-9+/=]+)'/);
  return m?.[1] ?? null;
}

// ─── Functional ACs ─────────────────────────────────────────────────────────

test.describe("Locale SSR routing", () => {
  test('AC1a: / → 200 + <html lang="en">', async ({ request }) => {
    const res = await request.get("/", { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(await res.text()).toMatch(/<html lang="en"/);
  });

  test('AC1b: /fr/ → 200 + <html lang="fr">', async ({ request }) => {
    const res = await request.get("/fr/", { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(await res.text()).toMatch(/<html lang="fr"/);
  });

  test('AC1c: /ja/ → 200 + <html lang="ja">', async ({ request }) => {
    const res = await request.get("/ja/", { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(await res.text()).toMatch(/<html lang="ja"/);
  });
});

test.describe("Bot bypass", () => {
  for (const ua of ["ClaudeBot/1.0", "GPTBot/1.2", "Googlebot/2.1", "PerplexityBot/1.0"]) {
    test(`AC2: ${ua} → 200, no redirect`, async ({ request }) => {
      const res = await request.get("/", {
        maxRedirects: 0,
        headers: { "User-Agent": ua, "Accept-Language": "fr-BE,fr;q=0.9" },
      });
      expect(res.status()).toBe(200);
      expect(res.headers()["location"]).toBeUndefined();
    });
  }
});

test("AC3: Accept-Language fr-BE → 302 /fr/", async ({ request }) => {
  const res = await request.get("/", {
    maxRedirects: 0,
    headers: { "Accept-Language": "fr-BE,fr;q=0.9,en;q=0.5" },
  });
  expect(res.status()).toBe(302);
  expect(res.headers()["location"]).toMatch(/\/fr\/$/);
});

test("AC4: Accept-Language ja-JP → 302 /ja/", async ({ request }) => {
  const res = await request.get("/", {
    maxRedirects: 0,
    headers: { "Accept-Language": "ja-JP,ja;q=0.9" },
  });
  expect(res.status()).toBe(302);
  expect(res.headers()["location"]).toMatch(/\/ja\/$/);
});

test("AC5: Accept-Language en-US → 200 direct", async ({ request }) => {
  const res = await request.get("/", {
    maxRedirects: 0,
    headers: { "Accept-Language": "en-US,en;q=0.9" },
  });
  expect(res.status()).toBe(200);
  expect(res.headers()["location"]).toBeUndefined();
});

test("AC6: Cookie lang=fr overrides Accept-Language en-US → 302 /fr/", async ({ request }) => {
  const res = await request.get("/", {
    maxRedirects: 0,
    headers: { "Accept-Language": "en-US,en;q=0.9", Cookie: "lang=fr" },
  });
  expect(res.status()).toBe(302);
  expect(res.headers()["location"]).toMatch(/\/fr\/$/);
});

test.describe("AC7: Vary scope — present only on /, absent elsewhere", () => {
  test("/ has Vary: Accept-Language, Cookie", async ({ request }) => {
    const res = await request.get("/", {
      headers: { "Accept-Language": "en-US" },
      maxRedirects: 0,
    });
    expect(res.headers()["vary"]).toBe("Accept-Language, Cookie");
  });

  for (const path of ["/fr/", "/ja/", "/blog/", "/favicon-32x32.png", "/sitemap-index.xml"]) {
    test(`${path} has NO Vary`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.headers()["vary"]).toBeUndefined();
    });
  }
});

test("AC8: hreflang en/fr/ja + x-default present in <head>", async ({ page }) => {
  await page.goto("/");
  const langs = await page.$$eval('link[rel="alternate"][hreflang]', (els) =>
    els.map((el) => el.getAttribute("hreflang"))
  );
  expect(langs).toEqual(expect.arrayContaining(["en", "fr", "ja", "x-default"]));
});

test("AC9: Sitemap covers all 3 locales", async ({ request }) => {
  const res = await request.get("/sitemap-0.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  expect(xml).toContain("<loc>https://jonathan-aerts.dev/</loc>");
  expect(xml).toContain("<loc>https://jonathan-aerts.dev/fr/</loc>");
  expect(xml).toContain("<loc>https://jonathan-aerts.dev/ja/</loc>");
});

test("AC10: unknown path → 404 served from dist/404.html", async ({ request }) => {
  const res = await request.get(`/this-path-does-not-exist-${Date.now()}`, { maxRedirects: 0 });
  expect(res.status()).toBe(404);
  const html = await res.text();
  expect(html).toContain("Page not found");
  expect(html).toMatch(/<html lang="en"/);
});

test("AC11: JSON-LD Person identical across the 3 locales", async ({ request }) => {
  async function jsonLd(path: string): Promise<unknown> {
    const res = await request.get(path, { maxRedirects: 0 });
    const html = await res.text();
    const m = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
    if (!m) throw new Error(`No JSON-LD on ${path}`);
    return JSON.parse(m[1]);
  }
  const [en, fr, ja] = await Promise.all([jsonLd("/"), jsonLd("/fr/"), jsonLd("/ja/")]);
  expect(fr).toEqual(en);
  expect(ja).toEqual(en);
});

// ─── Security headers ────────────────────────────────────────────────────────

test.describe("AC12: All 7 security headers on HTML responses", () => {
  for (const path of ["/", "/fr/", "/ja/"]) {
    test(`${path} carries all 7 headers`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expectAllHeaders(res, SEVEN_HEADERS);
    });
  }

  test("Strict-Transport-Security includes preload + 2y max-age", async ({ request }) => {
    const res = await request.get("/");
    const sts = res.headers()["strict-transport-security"] ?? "";
    expect(sts).toContain("max-age=63072000");
    expect(sts).toContain("includeSubDomains");
    expect(sts).toContain("preload");
  });
});

test("AC13: CSP uses per-request nonce, no 'unsafe-inline' on script-src", async ({ request }) => {
  const r1 = await request.get("/", { maxRedirects: 0 });
  const r2 = await request.get("/", { maxRedirects: 0 });
  const csp1 = r1.headers()["content-security-policy"] ?? "";
  const csp2 = r2.headers()["content-security-policy"] ?? "";

  const scriptSrc1 = csp1.split(";").find((d) => d.trim().startsWith("script-src ")) ?? "";
  expect(scriptSrc1).not.toContain("unsafe-inline");
  expect(csp1).not.toContain("unsafe-eval");
  expect(csp1).toContain("object-src 'none'");
  expect(csp1).toContain("report-to csp-endpoint");
  expect(csp1).toContain("report-uri /csp-report");
  expect(r1.headers()["reporting-endpoints"]).toBeDefined();

  // Nonce uniqueness across two requests.
  const n1 = extractNonceFromCsp(csp1);
  const n2 = extractNonceFromCsp(csp2);
  expect(n1).not.toBeNull();
  expect(n2).not.toBeNull();
  expect(n1).not.toBe(n2);
});

test("AC14: Asset responses have 6 headers but NO CSP", async ({ request }) => {
  const res = await request.get("/favicon-32x32.png", { maxRedirects: 0 });
  expect(res.status()).toBe(200);
  expectAllHeaders(res, SIX_STATIC_HEADERS);
  expectNoHeader(res, "content-security-policy");

  // Same shape on the 302 redirect from /.
  const redirect = await request.get("/", {
    maxRedirects: 0,
    headers: { "Accept-Language": "fr-BE,fr;q=0.9" },
  });
  expect(redirect.status()).toBe(302);
  expectAllHeaders(redirect, SIX_STATIC_HEADERS);
  expectNoHeader(redirect, "content-security-policy");
});

// ─── CSP behaviour live (the 'strict-dynamic' experiment) ───────────────────
//
// These tests load the page in a real browser and listen for CSP-violation
// console messages. A failure here is the signal to revert 'strict-dynamic'
// per Part 1c of the spec.

async function navigateAndCollectErrors(page: Page, path: string) {
  const cspErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (
      text.toLowerCase().includes("content security policy") ||
      text.toLowerCase().includes("csp") ||
      text.toLowerCase().includes("refused to execute")
    ) {
      cspErrors.push(`${msg.type()}: ${text}`);
    }
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });
  await page.goto(path, { waitUntil: "load" });
  // Give Astro hydration + GoatCounter ~5s to settle and surface any
  // CSP violation reports.
  await page.waitForTimeout(5_000);
  return { cspErrors, pageErrors };
}

test.describe("CSP live behaviour (no violations, GoatCounter loads)", () => {
  for (const path of ["/", "/fr/", "/ja/"]) {
    test(`${path} has zero CSP-related console errors during 5s after load`, async ({ page }) => {
      const { cspErrors, pageErrors } = await navigateAndCollectErrors(page, path);
      expect(cspErrors, `CSP errors on ${path}:\n${cspErrors.join("\n")}`).toHaveLength(0);
      expect(pageErrors, `Page errors on ${path}:\n${pageErrors.join("\n")}`).toHaveLength(0);
    });
  }

  test("GoatCounter loader fires at least one request to gc.zgo.at", async ({ page }) => {
    const gcRequests: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("gc.zgo.at") || url.includes("goatcounter.com")) {
        gcRequests.push(url);
      }
    });
    await page.goto("/");
    await page.waitForTimeout(5_000);
    expect(gcRequests.length, "expected ≥1 GoatCounter request").toBeGreaterThan(0);
  });

  test('Document contains <script nonce="…"> tags (HTMLRewriter stamped them)', async ({
    page,
  }) => {
    await page.goto("/");
    const noncedScripts = await page.evaluate(
      () => document.querySelectorAll("script[nonce]").length
    );
    expect(noncedScripts).toBeGreaterThan(0);
  });

  test("Two consecutive navigations produce different nonces", async ({ page, request }) => {
    const grab = async (): Promise<string | null> => {
      const res = await request.get("/", { maxRedirects: 0 });
      return extractNonceFromCsp(res.headers()["content-security-policy"]);
    };
    const a = await grab();
    const b = await grab();
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a).not.toBe(b);
  });
});

// ─── CSP reporting endpoint ─────────────────────────────────────────────────

test("AC15: POST /csp-report with valid body → 204", async ({ request }) => {
  const body = JSON.stringify({
    "csp-report": {
      "document-uri": "https://jonathan-aerts.dev/",
      "violated-directive": "script-src",
      "blocked-uri": "https://evil.example/",
    },
  });
  const res = await request.post("/csp-report", {
    headers: { "content-type": "application/csp-report" },
    data: body,
    maxRedirects: 0,
  });
  expect(res.status()).toBe(204);
});

test("AC15b: POST /csp-report with malformed body → 400", async ({ request }) => {
  const res = await request.post("/csp-report", {
    headers: { "content-type": "application/csp-report" },
    data: "{not-json",
    maxRedirects: 0,
  });
  expect(res.status()).toBe(400);
});

test("AC15c: POST /csp-report does NOT carry Vary header", async ({ request }) => {
  const res = await request.post("/csp-report", {
    headers: { "content-type": "application/csp-report" },
    data: JSON.stringify({ "csp-report": {} }),
    maxRedirects: 0,
  });
  expectNoHeader(res, "vary");
});
