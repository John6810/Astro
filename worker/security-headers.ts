// Security response headers + CSP for the CF Worker.
//
// Strategy: nonce-based CSP with `'strict-dynamic'`, no `'unsafe-inline'`.
//
//   - Astro emits a handful of inline <script> blocks per page (JSON-LD,
//     theme bootstrap, two `type="module"` blocks for partial hydration)
//     plus one scoped <style> block. Their content changes whenever the
//     site is rebuilt, so hash-based CSP is fragile — every component
//     edit would require regenerating hashes.
//   - Nonce-based CSP via HTMLRewriter is a single per-request token
//     that we attach to every <script>/<style> element on the fly. The
//     same nonce goes into the CSP header. No coupling to the build.
//   - `'strict-dynamic'` is layered on `script-src` so modern browsers
//     trust scripts the nonced bootstrap dynamically inserts (Astro
//     hydration islands), while older browsers fall back to the
//     `'self'` + `https://gc.zgo.at` allowlist.
//   - `'unsafe-inline'` is NOT used on script-src OR style-src.
//
// CSP violation reporting is wired through the same response:
//   - `Reporting-Endpoints: csp-endpoint="<absolute /csp-report URL>"`
//     declares the modern Reporting API endpoint.
//   - CSP itself emits `report-to csp-endpoint` (modern browsers) and
//     `report-uri /csp-report` (legacy CSP2 fallback).
//   - The matching POST handler lives in worker/index.ts. See
//     docs/security-headers.md for the end-to-end flow.

/** Static security headers attached to every response. */
const STATIC_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
};

/**
 * Absolute URL for the CSP report endpoint, used by the modern
 * Reporting-Endpoints header. Hardcoded to the apex so reports from
 * preview deployments (workers.dev subdomains) still land in the same
 * Workers Logs stream we monitor for production.
 */
const CSP_REPORT_ENDPOINT_URL = "https://jonathan-aerts.dev/csp-report";

const REPORTING_ENDPOINTS_VALUE = `csp-endpoint="${CSP_REPORT_ENDPOINT_URL}"`;

/**
 * Per-request CSP nonce. 16 random bytes → base64 (24 chars including
 * padding). Cheap, unguessable, fits under any nonce length limit.
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Build the CSP string for HTML responses.
 *
 *   - `'nonce-…'` on script-src + style-src whitelists this request's
 *     inline blocks (HTMLRewriter stamps every <script>/<style> with the
 *     same nonce attribute, see rewriteHtmlWithNonce).
 *   - `'strict-dynamic'` on script-src: modern browsers (CSP3) trust
 *     dynamic script insertion by nonced scripts. The `'self'` and
 *     `https://gc.zgo.at` entries are CSP3-ignored when 'strict-dynamic'
 *     is present, but kept as a fallback for older browsers.
 *   - `object-src 'none'` explicitly forbids <object>/<embed>/<applet>.
 *     Some scanners flag the absence even though `default-src 'self'`
 *     would already restrict these — explicit is clearer.
 *   - `connect-src https://*.goatcounter.com` allows the analytics
 *     count beacon.
 *   - `img-src https:` allows any HTTPS image (logos linked from outside).
 *   - `frame-ancestors 'none'` is the modern equivalent of
 *     X-Frame-Options: DENY.
 *   - `report-to csp-endpoint` / `report-uri /csp-report` send violations
 *     to the in-Worker POST handler that logs them via `console.log`
 *     (Workers Logs picks them up automatically).
 */
export function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // script-src allowlist:
    //   - `'self'` + `'nonce-${nonce}'` + `'strict-dynamic'` — primary,
    //     CSP3 strategy for Astro hydration islands.
    //   - `https://gc.zgo.at` — GoatCounter traffic beacon.
    //   - `https://static.cloudflareinsights.com` — CF Web Analytics
    //     (RUM) beacon. Modern browsers ignore this entry once
    //     'strict-dynamic' is in play, but it's the fallback for
    //     CSP2-only User-Agents and for any environment where the
    //     beacon <script> tag fails to receive the per-request nonce
    //     attribute (HTMLRewriter race conditions, etc).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://gc.zgo.at https://static.cloudflareinsights.com`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: https:",
    "font-src 'self'",
    // connect-src allowlist:
    //   - `'self'` — own fetches, including /csp-report.
    //   - `https://*.goatcounter.com` — GoatCounter ingest.
    //   - `https://cloudflareinsights.com` — CF Web Analytics POSTs
    //     RUM metrics to `https://cloudflareinsights.com/cdn-cgi/rum`.
    //     Note the apex, NOT the `static.` subdomain (different host
    //     for delivery vs ingest).
    "connect-src 'self' https://*.goatcounter.com https://cloudflareinsights.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    "report-to csp-endpoint",
    "report-uri /csp-report",
  ].join("; ");
}

/** True if the response looks like HTML — used to gate CSP + HTMLRewriter. */
export function isHtmlResponse(response: Response): boolean {
  const ct = response.headers.get("content-type") ?? "";
  return ct.toLowerCase().startsWith("text/html");
}

/**
 * Stream the response body through HTMLRewriter to stamp `nonce="…"`
 * on every <script> and <style> element. Non-mutating elsewhere.
 *
 * HTMLRewriter is a CF Workers built-in, designed for this exact use
 * case — streaming, no full-DOM buffering.
 */
export function rewriteHtmlWithNonce(response: Response, nonce: string): Response {
  class NonceStamper {
    constructor(private readonly value: string) {}
    element(el: Element): void {
      el.setAttribute("nonce", this.value);
    }
  }
  const stamper = new NonceStamper(nonce);
  return new HTMLRewriter().on("script", stamper).on("style", stamper).transform(response);
}

/**
 * Merge the static security headers (+ CSP and Reporting-Endpoints when
 * a `nonce` is given) onto the response. Returns a new Response with
 * the same body, status and status text — existing headers like Vary /
 * Cache-Control / Content-Type / Location are preserved verbatim.
 */
export function applySecurityHeaders(
  response: Response,
  _request: Request,
  nonce?: string
): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(STATIC_HEADERS)) {
    headers.set(k, v);
  }
  if (nonce) {
    headers.set("Content-Security-Policy", buildCsp(nonce));
    headers.set("Reporting-Endpoints", REPORTING_ENDPOINTS_VALUE);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
