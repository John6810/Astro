// Security response headers + CSP for the CF Worker.
//
// Strategy: nonce-based CSP.
//
//   - Astro emits a handful of inline <script> blocks per page (JSON-LD,
//     theme bootstrap, two `type="module"` blocks for partial hydration)
//     plus one scoped <style> block. Their content changes whenever the
//     site is rebuilt, so hash-based CSP is fragile — every component
//     edit would require regenerating hashes.
//   - Nonce-based CSP via HTMLRewriter is a single per-request token
//     that we attach to every <script>/<style> element on the fly. The
//     same nonce goes into the CSP header. No coupling to the build.
//   - `'unsafe-inline'` is NOT used on script-src. Removed from style-src
//     too — Astro's scoped styles get the nonce just like scripts.
//
// Notes on application:
//   - applySecurityHeaders MERGES into the response headers; existing
//     Vary, Cache-Control, Content-Type, Location are preserved so the
//     locale redirect (Vary: Accept-Language, Cookie + Cache-Control:
//     no-cache) keeps working.
//   - CSP is set only when we have a nonce to bind to (i.e. on HTML
//     responses). Static assets (images, fonts, .md, sitemap) get the
//     other six security headers but no CSP — CSP has no effect on
//     non-document responses anyway and emitting it would force the CDN
//     to vary on it for non-doc content.

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
 * Per-request CSP nonce. 16 random bytes → base64 (22 chars). Cheap,
 * unguessable, fits comfortably under any CSP nonce length restriction.
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Build the CSP string for HTML responses.
 *
 *   - `'nonce-...'` on script-src + style-src whitelists this request's
 *     inline blocks (HTMLRewriter stamps every <script>/<style> with the
 *     same nonce attribute, see rewriteHtmlWithNonce).
 *   - `https://gc.zgo.at` allows the GoatCounter loader; HTMLRewriter
 *     also nonces that <script src> tag, so this is belt-and-braces.
 *   - `connect-src https://*.goatcounter.com` allows the count ping.
 *   - `img-src https:` allows any HTTPS image (linked logos etc.).
 *   - `frame-ancestors 'none'` is the modern counterpart of
 *     X-Frame-Options: DENY.
 *   - `upgrade-insecure-requests` flips any stray `http://` reference.
 */
export function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://gc.zgo.at`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://*.goatcounter.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/** True if the response looks like HTML — used to gate CSP + HTMLRewriter. */
export function isHtmlResponse(response: Response): boolean {
  const ct = response.headers.get("content-type") ?? "";
  return ct.toLowerCase().startsWith("text/html");
}

/**
 * Stream the response body through HTMLRewriter to stamp `nonce="..."`
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
 * Merge the static security headers (+ CSP when `nonce` is given) onto
 * the response. Returns a new Response with the same body, status and
 * status text — existing headers like Vary / Cache-Control / Content-Type
 * / Location are preserved verbatim.
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
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
