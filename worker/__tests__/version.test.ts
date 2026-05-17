// Unit tests for the GET /version endpoint.
//
// Two angles:
//   - End-to-end via SELF.fetch — confirms routing, headers, JSON shape,
//     and that the standard security headers are layered on top.
//   - Pure helpers (buildVersionResponse, isVersionRequest) — covers
//     branches that SELF.fetch can't directly exercise (e.g. non-GET
//     methods).

import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { buildVersionResponse, isVersionRequest } from "../version";

const ORIGIN = "https://example.com";

const SEVEN_HEADERS = [
  "strict-transport-security",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "x-frame-options",
  "cross-origin-opener-policy",
  // Note: /version is JSON, not HTML, so it gets the SIX static
  // headers plus content-security-policy with a generic policy
  // (no nonce injection on JSON responses). See applySecurityHeaders.
] as const;

describe("isVersionRequest", () => {
  it.each([
    { url: "https://x.test/version", method: "GET", expected: true },
    { url: "https://x.test/version/", method: "GET", expected: false }, // strict
    { url: "https://x.test/version?ts=1", method: "GET", expected: true }, // query string OK
    { url: "https://x.test/version", method: "POST", expected: false },
    { url: "https://x.test/version", method: "HEAD", expected: false },
    { url: "https://x.test/version", method: "OPTIONS", expected: false },
    { url: "https://x.test/v", method: "GET", expected: false },
    { url: "https://x.test/", method: "GET", expected: false },
  ])("$method $url -> $expected", ({ url, method, expected }) => {
    expect(isVersionRequest(new URL(url), method)).toBe(expected);
  });
});

describe("buildVersionResponse", () => {
  it("returns 200 with JSON content-type and no-store cache directive", () => {
    const res = buildVersionResponse();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^application\/json/);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("body parses as JSON with sha + builtAt + worker keys", async () => {
    const res = buildVersionResponse();
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("sha");
    expect(body).toHaveProperty("builtAt");
    expect(body.worker).toBe("astro");
  });

  it("sha is non-empty and matches the expected shape (40 hex chars OR 'dev')", async () => {
    const res = buildVersionResponse();
    const body = (await res.json()) as { sha: string };
    expect(body.sha.length).toBeGreaterThan(0);
    // CI sets a real SHA via $GITHUB_SHA / $WORKERS_CI_COMMIT_SHA; local
    // dev with no .git/ may land on "dev". Both must be acceptable.
    expect(body.sha).toMatch(/^[a-f0-9]{40}$|^dev$/);
  });

  it("builtAt is an ISO-8601 timestamp", async () => {
    const res = buildVersionResponse();
    const body = (await res.json()) as { builtAt: string };
    // Either the placeholder (epoch) committed with version.generated.ts,
    // or a real ISO timestamp written by scripts/generate-version.mjs.
    expect(body.builtAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe("GET /version via SELF.fetch", () => {
  it("returns 200 with parseable JSON", async () => {
    const res = await SELF.fetch(`${ORIGIN}/version`, { method: "GET", redirect: "manual" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.worker).toBe("astro");
    expect(typeof body.sha).toBe("string");
    expect(typeof body.builtAt).toBe("string");
  });

  it("carries Cache-Control: no-store (drift detection requires fresh reads)", async () => {
    const res = await SELF.fetch(`${ORIGIN}/version`, { method: "GET", redirect: "manual" });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("does NOT carry a Vary header (response is identical for every caller)", async () => {
    const res = await SELF.fetch(`${ORIGIN}/version`, { method: "GET", redirect: "manual" });
    expect(res.headers.get("vary")).toBeNull();
  });

  it("carries the six static security headers (HSTS, X-Frame-Options, etc.)", async () => {
    const res = await SELF.fetch(`${ORIGIN}/version`, { method: "GET", redirect: "manual" });
    for (const h of SEVEN_HEADERS) {
      expect(res.headers.get(h), `header ${h}`).not.toBeNull();
    }
  });

  it("is unaffected by Accept-Language (no redirect, no locale negotiation)", async () => {
    const res = await SELF.fetch(`${ORIGIN}/version`, {
      method: "GET",
      headers: { "Accept-Language": "fr-BE,fr;q=0.9" },
      redirect: "manual",
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("POST /version falls through to assets (not handled as version)", async () => {
    const res = await SELF.fetch(`${ORIGIN}/version`, { method: "POST", redirect: "manual" });
    // Anything other than 200 is fine — the point is we did NOT hit
    // the JSON branch, which would have returned 200 with
    // application/json. We expect either 404 (no static asset) or
    // 405-ish behavior from the assets binding.
    if (res.status === 200) {
      const ct = res.headers.get("content-type") ?? "";
      expect(ct.startsWith("application/json")).toBe(false);
    }
  });
});
