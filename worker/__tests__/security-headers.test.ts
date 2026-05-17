// Security headers + CSP shape + /csp-report endpoint unit tests.

import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetCspReportThrottle } from "../csp-report";

const ORIGIN = "https://example.com";

function fetchPath(
  path: string,
  init: { headers?: Record<string, string>; method?: string; body?: BodyInit } = {}
): Promise<Response> {
  return SELF.fetch(`${ORIGIN}${path}`, {
    method: init.method ?? "GET",
    headers: init.headers,
    body: init.body,
    redirect: "manual",
  });
}

const SEVEN_HEADERS = [
  "strict-transport-security",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "x-frame-options",
  "cross-origin-opener-policy",
  "content-security-policy",
] as const;

const SIX_STATIC_HEADERS = SEVEN_HEADERS.slice(0, 6);

function extractNonceFromCsp(csp: string): string {
  const m = csp.match(/'nonce-([A-Za-z0-9+/=]+)'/);
  if (!m) throw new Error(`No nonce found in CSP: ${csp}`);
  return m[1];
}

describe("all 7 security headers on HTML responses", () => {
  it("/ returns every required header", async () => {
    const res = await fetchPath("/");
    for (const h of SEVEN_HEADERS) {
      expect(res.headers.get(h), `header ${h}`).not.toBeNull();
    }
  });

  it("Strict-Transport-Security contains max-age, includeSubDomains, preload", async () => {
    const res = await fetchPath("/");
    const sts = res.headers.get("strict-transport-security") ?? "";
    expect(sts).toContain("max-age=63072000");
    expect(sts).toContain("includeSubDomains");
    expect(sts).toContain("preload");
  });

  it("X-Frame-Options is DENY", async () => {
    const res = await fetchPath("/");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });

  it("Cross-Origin-Opener-Policy is same-origin", async () => {
    const res = await fetchPath("/");
    expect(res.headers.get("cross-origin-opener-policy")).toBe("same-origin");
  });

  it("X-Content-Type-Options is nosniff", async () => {
    const res = await fetchPath("/");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });
});

describe("CSP shape", () => {
  it("contains nonce-<24 base64 chars>", async () => {
    const res = await fetchPath("/");
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=]{24}'/);
  });

  it("script-src does NOT contain 'unsafe-inline'", async () => {
    const res = await fetchPath("/");
    const csp = res.headers.get("content-security-policy") ?? "";
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src ")) ?? "";
    expect(scriptSrc).not.toContain("unsafe-inline");
  });

  it("CSP does NOT contain 'unsafe-eval' anywhere", async () => {
    const res = await fetchPath("/");
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(csp).not.toContain("unsafe-eval");
  });

  it("contains object-src 'none'", async () => {
    const res = await fetchPath("/");
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("object-src 'none'");
  });

  it("contains frame-ancestors 'none'", async () => {
    const res = await fetchPath("/");
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("contains report-to csp-endpoint", async () => {
    const res = await fetchPath("/");
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("report-to csp-endpoint");
  });

  it("contains report-uri /csp-report", async () => {
    const res = await fetchPath("/");
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("report-uri /csp-report");
  });

  it("Reporting-Endpoints header points at /csp-report", async () => {
    const res = await fetchPath("/");
    const reporting = res.headers.get("reporting-endpoints") ?? "";
    expect(reporting).toContain("csp-endpoint=");
    expect(reporting).toContain("/csp-report");
  });

  // CF Web Analytics allowances. The beacon source lives at
  // static.cloudflareinsights.com; its ingest POSTs land at
  // cloudflareinsights.com/cdn-cgi/rum. Both need explicit allowance
  // for the CSP3 'strict-dynamic' fallback path (CSP2-only browsers,
  // race conditions where HTMLRewriter misses the tag).
  it("script-src allowlists https://static.cloudflareinsights.com", async () => {
    const res = await fetchPath("/");
    const csp = res.headers.get("content-security-policy") ?? "";
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src ")) ?? "";
    expect(scriptSrc).toContain("https://static.cloudflareinsights.com");
  });

  it("connect-src allowlists https://cloudflareinsights.com (RUM ingest)", async () => {
    const res = await fetchPath("/");
    const csp = res.headers.get("content-security-policy") ?? "";
    const connectSrc = csp.split(";").find((d) => d.trim().startsWith("connect-src ")) ?? "";
    expect(connectSrc).toContain("https://cloudflareinsights.com");
  });
});

describe("nonce uniqueness + body integrity", () => {
  it("two consecutive requests produce different nonces", async () => {
    const r1 = await fetchPath("/");
    const r2 = await fetchPath("/");
    const nonce1 = extractNonceFromCsp(r1.headers.get("content-security-policy") ?? "");
    const nonce2 = extractNonceFromCsp(r2.headers.get("content-security-policy") ?? "");
    expect(nonce1).not.toBe(nonce2);
  });

  it("the nonce in the CSP header matches the nonce stamped on <script> tags", async () => {
    const res = await fetchPath("/");
    const nonce = extractNonceFromCsp(res.headers.get("content-security-policy") ?? "");
    const html = await res.text();
    // At least one <script nonce="..."> with our exact nonce value.
    const escaped = nonce.replace(/[+/=]/g, "\\$&");
    expect(html).toMatch(new RegExp(`<script[^>]*nonce="${escaped}"`));
  });

  it("the nonce in the CSP header matches the nonce stamped on <style> tags", async () => {
    const res = await fetchPath("/");
    const nonce = extractNonceFromCsp(res.headers.get("content-security-policy") ?? "");
    const html = await res.text();
    const escaped = nonce.replace(/[+/=]/g, "\\$&");
    expect(html).toMatch(new RegExp(`<style[^>]*nonce="${escaped}"`));
  });
});

describe("static assets and redirects", () => {
  it("/favicon-32x32.png carries the 6 static security headers but NO CSP", async () => {
    const res = await fetchPath("/favicon-32x32.png");
    expect(res.status).toBe(200);
    for (const h of SIX_STATIC_HEADERS) {
      expect(res.headers.get(h), `header ${h}`).not.toBeNull();
    }
    expect(res.headers.get("content-security-policy")).toBeNull();
  });

  it("/ 302 redirect carries 6 security headers, no CSP", async () => {
    const res = await fetchPath("/", { headers: { "Accept-Language": "fr-BE,fr;q=0.9" } });
    expect(res.status).toBe(302);
    for (const h of SIX_STATIC_HEADERS) {
      expect(res.headers.get(h), `header ${h}`).not.toBeNull();
    }
    expect(res.headers.get("content-security-policy")).toBeNull();
  });
});

describe("/csp-report endpoint", () => {
  beforeEach(() => {
    __resetCspReportThrottle();
  });

  it("POST with application/csp-report → 204", async () => {
    const body = JSON.stringify({
      "csp-report": {
        "document-uri": "https://example.com/",
        "violated-directive": "script-src",
      },
    });
    const res = await fetchPath("/csp-report", {
      method: "POST",
      headers: { "content-type": "application/csp-report" },
      body,
    });
    expect(res.status).toBe(204);
  });

  it("POST with application/reports+json → 204", async () => {
    const body = JSON.stringify([
      { type: "csp-violation", body: { "violated-directive": "img-src" } },
    ]);
    const res = await fetchPath("/csp-report", {
      method: "POST",
      headers: { "content-type": "application/reports+json" },
      body,
    });
    expect(res.status).toBe(204);
  });

  it("POST with malformed JSON body → 400", async () => {
    const res = await fetchPath("/csp-report", {
      method: "POST",
      headers: { "content-type": "application/csp-report" },
      body: "{not-json",
    });
    expect(res.status).toBe(400);
  });

  it("POST with empty body → 400", async () => {
    const res = await fetchPath("/csp-report", {
      method: "POST",
      headers: { "content-type": "application/csp-report" },
      body: "",
    });
    expect(res.status).toBe(400);
  });

  it("POST with text/plain content-type → 400", async () => {
    const res = await fetchPath("/csp-report", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "{}",
    });
    expect(res.status).toBe(400);
  });

  it("GET /csp-report → falls through to assets (not handled as a report)", async () => {
    // /csp-report doesn't exist as a static page either, so it should
    // 404 — but importantly, NOT 204 (the report handler is POST-only).
    const res = await fetchPath("/csp-report");
    expect(res.status).not.toBe(204);
  });

  it("does NOT carry Vary header (not a locale-routed response)", async () => {
    const res = await fetchPath("/csp-report", {
      method: "POST",
      headers: { "content-type": "application/csp-report" },
      body: JSON.stringify({ "csp-report": {} }),
    });
    expect(res.headers.get("vary")).toBeNull();
  });
});
