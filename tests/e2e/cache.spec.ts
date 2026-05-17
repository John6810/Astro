// E2E cache verification — exercises the edge cache against the
// REAL deployed preview URL. Distinct from worker/__tests__/cache.test.ts
// which runs in workerd and exercises an in-process Cache API: this
// suite hits the actual CF colo cache through the public DNS, so it's
// the only place we can validate that:
//
//   - CF Workers Builds did include the cache logic in the deployed
//     bundle
//   - The `s-maxage=300` Cache-Control is being respected by the
//     intermediate edge
//   - The Workers Cache API key collision rules behave the same in
//     the wild as in the test pool
//
// Note on flakiness: a fresh deploy starts with a cold edge cache,
// so the FIRST request after deploy will always be MISS. We don't
// assert MISS specifically — we assert that the SECOND request is
// HIT and that subsequent requests can differ in nonce. That's the
// contract we care about.

import { test, expect } from "@playwright/test";

test.describe("Edge cache on SSR routes", () => {
  test("two consecutive GET /: second is x-cache: HIT", async ({ request }) => {
    // Warm up. Don't assert the status of this request — it could
    // be MISS (fresh deploy) or HIT (cached from a previous CI run).
    await request.get("/", { maxRedirects: 0, headers: { "Accept-Language": "en-US" } });

    const r2 = await request.get("/", {
      maxRedirects: 0,
      headers: { "Accept-Language": "en-US" },
    });
    expect(r2.status()).toBe(200);
    expect(r2.headers()["x-cache"]).toBe("HIT");
  });

  // Playwright doesn't have `test.each` — generate one test per path
  // via a `for` loop. Tests are still independent at runtime.
  for (const path of ["/fr/", "/ja/"]) {
    test(`two consecutive GET ${path}: second is x-cache: HIT`, async ({ request }) => {
      await request.get(path, { maxRedirects: 0 });
      const r2 = await request.get(path, { maxRedirects: 0 });
      expect(r2.status()).toBe(200);
      expect(r2.headers()["x-cache"]).toBe("HIT");
    });
  }

  test("two HITs return DIFFERENT CSP nonces (per-request rewrite preserved)", async ({
    request,
  }) => {
    // Warm
    await request.get("/", { maxRedirects: 0, headers: { "Accept-Language": "en-US" } });

    const r1 = await request.get("/", {
      maxRedirects: 0,
      headers: { "Accept-Language": "en-US" },
    });
    const r2 = await request.get("/", {
      maxRedirects: 0,
      headers: { "Accept-Language": "en-US" },
    });
    expect(r1.headers()["x-cache"]).toBe("HIT");
    expect(r2.headers()["x-cache"]).toBe("HIT");

    const extractNonce = (csp: string | undefined) =>
      csp?.match(/'nonce-([A-Za-z0-9+/=]+)'/)?.[1] ?? null;
    const n1 = extractNonce(r1.headers()["content-security-policy"]);
    const n2 = extractNonce(r2.headers()["content-security-policy"]);
    expect(n1).not.toBeNull();
    expect(n2).not.toBeNull();
    expect(n1).not.toBe(n2);
  });

  test("302 redirect (Accept-Language fr-BE) has no x-cache header", async ({ request }) => {
    const res = await request.get("/", {
      maxRedirects: 0,
      headers: { "Accept-Language": "fr-BE,fr;q=0.9" },
    });
    expect(res.status()).toBe(302);
    expect(res.headers()["x-cache"]).toBeUndefined();
  });

  test("Bot UA always gets BYPASS, never HIT", async ({ request }) => {
    const r1 = await request.get("/", {
      maxRedirects: 0,
      headers: { "User-Agent": "ClaudeBot/1.0" },
    });
    const r2 = await request.get("/", {
      maxRedirects: 0,
      headers: { "User-Agent": "ClaudeBot/1.0" },
    });
    expect(r1.headers()["x-cache"]).toBe("BYPASS");
    expect(r2.headers()["x-cache"]).toBe("BYPASS");
  });

  test("Vary: Accept-Language, Cookie is preserved on cache hits", async ({ request }) => {
    await request.get("/", { maxRedirects: 0, headers: { "Accept-Language": "en-US" } });
    const r = await request.get("/", {
      maxRedirects: 0,
      headers: { "Accept-Language": "en-US" },
    });
    expect(r.headers()["x-cache"]).toBe("HIT");
    expect(r.headers()["vary"]).toBe("Accept-Language, Cookie");
  });
});

test.describe("Astro hydration + GoatCounter survive cache hits", () => {
  test("cached / still loads, GoatCounter beacon fires within 5s", async ({ page }) => {
    // Warm the cache
    await page.goto("/", { waitUntil: "load" });

    const beaconRequests: string[] = [];
    page.on("request", (req) => {
      const u = req.url();
      if (u.includes("gc.zgo.at")) beaconRequests.push(u);
    });

    // Second visit — should be a cache HIT but Astro must still run
    // client-side hydration and GoatCounter must still ping.
    const response = await page.goto("/", { waitUntil: "load" });
    expect(response?.headers()["x-cache"]).toBe("HIT");

    // Give GoatCounter 5s to fire (it's `async`, may delay).
    await page.waitForTimeout(5_000);
    expect(beaconRequests.length).toBeGreaterThan(0);
  });
});
