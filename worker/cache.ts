// Edge-cache helper for the three SSR HTML routes (`/`, `/fr/`, `/ja/`).
//
// Why bother:
//   The Worker re-runs Astro's static-asset fetch on every visit, plus
//   the HTMLRewriter pass that stamps a per-request CSP nonce. Without
//   caching, the SSR body is materialised from `dist/` on every hit
//   and HTMLRewriter is paid full price. With caching, we deduplicate
//   the body fetch (the expensive bit) while keeping the nonce stamp
//   per-request (CSP correctness).
//
// Why the per-request nonce isn't a caching problem:
//   The HTML committed to dist/ (and stored by env.ASSETS) carries
//   BARE `<script>` / `<style>` tags — no nonce attribute. Astro
//   doesn't emit a placeholder either. `rewriteHtmlWithNonce`
//   (worker/security-headers.ts) ADDS the attribute on every request
//   regardless of whether the body came from the cache or from a
//   fresh ASSETS fetch. So the cached body is always pre-stamp; the
//   downstream pipeline always stamps fresh. No correlation, no
//   stale-nonce risk.
//
// Scope:
//   Only `/`, `/fr/`, `/ja/` go through this module — see
//   `isCacheableSsrPath`. Static assets (images, fonts, CSS, JS,
//   sitemap, robots.txt) keep using the CF colocated default cache
//   via the env.ASSETS path; they don't need our help. Blog routes
//   are not cached because they change with content edits and the
//   traffic doesn't justify the invalidation complexity.
//
// Why a SHA salt in the cache key:
//   Workers Cache API entries are scoped to the PoP, not to the
//   Worker version. A deploy doesn't invalidate them. The 7-char
//   COMMIT_SHA prefix is added to the cache URL as a query param so
//   every deploy starts with a cold cache, which is exactly what we
//   want — stale dist/ output is a real failure mode.
//
// TTL:
//   `s-maxage=300` (5 min). Acceptable staleness for a portfolio. The
//   `max-age=0, must-revalidate` halves it from the browser cache so
//   navigating away and back still revalidates against the CDN.

import { COMMIT_SHA } from "./version.generated";

export type CacheStatus = "HIT" | "MISS" | "BYPASS";

/** Five minutes — see header doc. */
export const CACHE_TTL_SECONDS = 300;

/** 7-char SHA prefix — enough entropy to deploy-bust the cache. */
const CACHE_VERSION_TAG = COMMIT_SHA.slice(0, 7);

/** Set of pathnames that we cache. Strict — must match exactly. */
const CACHEABLE_PATHS = new Set<string>(["/", "/fr/", "/ja/"]);

/** True iff this pathname has a cache key. */
export function isCacheableSsrPath(pathname: string): boolean {
  return CACHEABLE_PATHS.has(pathname);
}

/**
 * Build the Workers Cache API key Request for a given URL.
 *
 * Strategy: include the COMMIT_SHA prefix as `_v=<sha7>` so deploys
 * naturally rotate the namespace. The actual locale is encoded in
 * the URL pathname (`/`, `/fr/`, `/ja/`), so no extra normalisation
 * is needed — the redirect logic upstream has already collapsed
 * locale variants into one of these three paths.
 *
 * The Request method is hard-coded to GET (Cache API contract — POST
 * isn't a cacheable request type).
 */
export function buildCacheKey(url: URL): Request {
  const keyUrl = new URL(url.toString());
  keyUrl.searchParams.set("_v", CACHE_VERSION_TAG);
  return new Request(keyUrl.toString(), { method: "GET" });
}

/**
 * Make a Response safe to store in the cache.
 *
 * Strips every header that depends on the request (Vary, CSP,
 * Reporting-Endpoints, HSTS, X-Frame-Options, the lot) so they never
 * leak from one request to another via the cache. Keeps only
 * content-type and content-length, which are body-intrinsic.
 *
 * Adds the `Cache-Control` header for any downstream proxy that
 * respects it — note this also satisfies the Workers Cache API
 * requirement for explicit caching directives.
 */
export function makeCacheable(response: Response): Response {
  const headers = new Headers();
  const ct = response.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  const cl = response.headers.get("content-length");
  if (cl) headers.set("content-length", cl);
  headers.set("Cache-Control", `public, s-maxage=${CACHE_TTL_SECONDS}, max-age=0, must-revalidate`);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Fetch from the cache, falling back to `freshLoader()` on miss.
 *
 * On miss: the fresh response is also written to the cache via
 * `ctx.waitUntil` (fire-and-forget) — the response goes back to the
 * caller immediately.
 *
 * Returns:
 *   - `response`: a fresh Response object the caller MUST further
 *     process (apply Vary, run HTMLRewriter for the nonce, apply
 *     security headers). The cache layer deliberately does NOT do
 *     any of those — that's the caller's job and keeps this module
 *     focused.
 *   - `status`: `"HIT"` or `"MISS"` so the caller can stamp
 *     `x-cache` on the outgoing response and emit an analytics event.
 *
 * Caching is gated to 200 responses with `text/html` content-type —
 * we don't cache 404s, 503s, or non-HTML bodies even on cacheable
 * paths. A 404 typically means the asset binding hasn't picked up
 * the new build yet; we want that to self-heal on the next deploy.
 */
export async function fetchThroughCache(
  ctx: ExecutionContext,
  url: URL,
  freshLoader: () => Promise<Response>
): Promise<{ response: Response; status: CacheStatus }> {
  const cache = (caches as unknown as { default: Cache }).default;
  const key = buildCacheKey(url);

  const hit = await cache.match(key);
  if (hit) {
    return { response: hit, status: "HIT" };
  }

  const fresh = await freshLoader();
  const isHtml200 =
    fresh.status === 200 &&
    (fresh.headers.get("content-type") ?? "").toLowerCase().startsWith("text/html");

  if (isHtml200) {
    // .clone() so both copies have an unconsumed body stream — one
    // for cache.put (consumed by the Cache API), one for the
    // response we return.
    const cacheable = makeCacheable(fresh.clone());
    ctx.waitUntil(cache.put(key, cacheable));
  }
  return { response: fresh, status: "MISS" };
}

/**
 * Attach `x-cache: HIT|MISS|BYPASS` to an outgoing Response.
 *
 * Returns a NEW Response (the input Response's body might already
 * be on its way upstream by the time we tag it — we don't want to
 * mutate frozen headers either).
 */
export function withCacheStatusHeader(response: Response, status: CacheStatus): Response {
  const headers = new Headers(response.headers);
  headers.set("x-cache", status);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
