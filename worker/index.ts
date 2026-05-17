// Cloudflare Worker — Accept-Language redirect on `/` only.
// Static assets for every other path are served by the platform-provided
// ASSETS binding (configured in wrangler.jsonc).
//
// Why a Worker (and not Pages Functions):
//   The project is being migrated from CF Pages → CF Workers + Static Assets.
//   Pages Functions are gone in the Workers model; logic lives in a single
//   Worker entry. wrangler.jsonc declares `run_worker_first: true` so the
//   Worker sees every request before the asset binding — without that, the
//   asset would be returned before the redirect logic could run on `/`.
//
// Routing decision (only on `/`):
//   1. Bot User-Agent     -> serve dist/index.html (EN). No redirect, no Vary.
//   2. `lang=<code>` cookie -> honor the user's explicit choice from the
//                              LanguageSwitcher.
//   3. Accept-Language    -> first supported tag in q-order wins.
//
// `Vary: Accept-Language, Cookie` is attached ONLY to responses for `/`
// so the CDN can keep cached variants separate without poisoning every
// static asset's cache.
//
// Security headers + CSP are layered on top of every branch — see
// worker/security-headers.ts for the strategy. The locale-routing
// branches keep their own Vary / Cache-Control / Location intact;
// applySecurityHeaders only merges new keys.
//
// Edge caching is layered on top of the three SSR routes (`/`,
// `/fr/`, `/ja/`) via worker/cache.ts. The cache stores the bare
// HTML body and replays it on hit; the per-request CSP nonce is
// stamped by HTMLRewriter on EVERY request (hit OR miss), so cache
// correctness and CSP correctness are decoupled. Bot bypass and
// 302 redirects deliberately skip the cache.
//
// Custom request metrics are emitted to the ANALYTICS binding on every
// branch — see worker/analytics.ts and docs/analytics-queries.md.

import {
  applySecurityHeaders,
  generateNonce,
  isHtmlResponse,
  rewriteHtmlWithNonce,
} from "./security-headers";
import { handleCspReport, isCspReportRequest } from "./csp-report";
import {
  classifyUserAgent,
  localeFromPath,
  recordCacheStatus,
  recordRequest,
  type AnalyticsLocale,
  type CacheStatusLabel,
  type EventType,
} from "./analytics";
import {
  fetchThroughCache,
  isCacheableSsrPath,
  withCacheStatusHeader,
  type CacheStatus,
} from "./cache";
import { buildVersionResponse, isVersionRequest } from "./version";

export interface Env {
  ASSETS: Fetcher;
  ANALYTICS?: AnalyticsEngineDataset;
}

/**
 * For any response coming back from env.ASSETS.fetch (or our own
 * Response objects), attach the static security headers and — if the
 * body is HTML — stream it through HTMLRewriter to stamp a CSP nonce
 * on every <script>/<style> before sending the CSP header that
 * mentions the same nonce.
 */
function secureResponse(response: Response, request: Request): Response {
  if (!isHtmlResponse(response)) {
    return applySecurityHeaders(response, request);
  }
  const nonce = generateNonce();
  const rewritten = rewriteHtmlWithNonce(response, nonce);
  return applySecurityHeaders(rewritten, request, nonce);
}

/**
 * Fire-and-forget analytics write. Wraps recordRequest in a resolved
 * Promise so ctx.waitUntil can hold the event loop just long enough
 * for the runtime to flush the datapoint without blocking the
 * response. writeDataPoint is synchronous + non-blocking on CF, so
 * this is mostly a contract marker that "this work is allowed to
 * outlive the response".
 */
function emitMetric(
  ctx: ExecutionContext,
  dataset: AnalyticsEngineDataset | undefined,
  event: Exclude<EventType, "csp_violation">,
  locale: AnalyticsLocale,
  ua: string
): void {
  if (!dataset) return;
  ctx.waitUntil(Promise.resolve(recordRequest(dataset, event, locale, classifyUserAgent(ua))));
}

/**
 * Fire-and-forget cache-outcome event. Pulled out so the cache
 * status from worker/cache.ts (uppercase wire-format) maps cleanly
 * to the lowercase Analytics Engine convention without callers
 * needing to do the conversion themselves.
 */
function emitCacheStatus(
  ctx: ExecutionContext,
  dataset: AnalyticsEngineDataset | undefined,
  status: CacheStatus,
  locale: AnalyticsLocale,
  route: string
): void {
  if (!dataset) return;
  const wire = status.toLowerCase() as CacheStatusLabel;
  ctx.waitUntil(Promise.resolve(recordCacheStatus(dataset, wire, locale, route)));
}

/**
 * True when the response is HTML — meaning a user-facing page, worth
 * counting in the analytics dataset. Static assets (images, fonts,
 * CSS, JS, XML, plain text) return false so the dataset stays focused
 * on traffic that maps to "someone read a page".
 *
 * The check matches `text/html` with an optional charset suffix
 * (`text/html; charset=utf-8`) and is case-insensitive. We do NOT
 * rely on isHtmlResponse() from security-headers.ts because that
 * helper has a different remit (deciding whether to inject a CSP
 * nonce) and we want analytics filtering decisions to remain explicit
 * here in the routing layer.
 *
 * Exported (with the `__` test-only prefix convention used elsewhere
 * in this module) so unit tests can verify the boolean directly
 * without round-tripping through SELF.fetch.
 */
export function __isHtmlContentType(response: Response): boolean {
  const ct = (response.headers.get("content-type") ?? "").toLowerCase();
  return ct.startsWith("text/html");
}

const BOT_UA =
  /ClaudeBot|Claude-Web|anthropic-ai|GPTBot|PerplexityBot|Google-Extended|CCBot|Googlebot|Bingbot|DuckDuckBot|YandexBot|Baiduspider|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|TelegramBot|WhatsApp/i;

const SUPPORTED = ["en", "fr", "ja"] as const;
type Locale = (typeof SUPPORTED)[number];
const DEFAULT_LOCALE: Locale = "en";

function isSupported(s: string | undefined): s is Locale {
  return !!s && (SUPPORTED as readonly string[]).includes(s);
}

/**
 * Parse an RFC 7231 Accept-Language header and return the highest-quality
 * supported locale, or undefined if no supported language matched.
 *
 * Examples:
 *   "fr-BE,fr;q=0.9,en;q=0.5"    -> "fr"
 *   "en-US,en;q=0.9"             -> "en"
 *   "de;q=0.9,en;q=0.5,ja;q=0.4" -> "en"
 *   "de"                         -> undefined
 */
function parseAcceptLanguage(header: string): Locale | undefined {
  if (!header) return undefined;
  const items = header
    .split(",")
    .map((raw) => {
      const [tagPart, ...rest] = raw.trim().split(";");
      const tag = tagPart.toLowerCase().split("-")[0];
      const qParam = rest.find((s) => s.trim().startsWith("q="));
      const q = qParam ? parseFloat(qParam.split("=")[1]) : 1;
      return { tag, q: Number.isFinite(q) ? q : 1 };
    })
    .filter((i) => i.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of items) {
    if (isSupported(tag)) return tag;
  }
  return undefined;
}

function readLangCookie(cookieHeader: string | null): Locale | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/(?:^|;\s*)lang=([a-z]+)/i);
  const value = match?.[1]?.toLowerCase();
  return isSupported(value) ? value : undefined;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") ?? "";

    // CSP violation reports — handled BEFORE locale routing. This path
    // is intentionally NOT served from dist/, MUST NOT carry Vary, and
    // MUST NOT trigger the Accept-Language redirect. The handler emits
    // its OWN `csp_violation` datapoint to the analytics dataset (with
    // a different blob layout than request events) — it doesn't go
    // through emitMetric below.
    if (isCspReportRequest(request, url)) {
      return handleCspReport(request, env, ctx);
    }

    // GET /version — drift detection endpoint. Returns the deployed
    // commit SHA + build timestamp. Handled BEFORE locale routing so
    // it's reachable on every locale-agnostic path, and explicitly
    // NOT instrumented (ops endpoint, would just be noise). Security
    // headers still applied so the response carries the standard
    // HSTS / X-Frame-Options / etc. set.
    if (isVersionRequest(url, request.method)) {
      return applySecurityHeaders(buildVersionResponse(), request);
    }

    // Non-root path branch. Splits into two:
    //   (a) Cacheable SSR locale routes (`/fr/`, `/ja/`) — go through
    //       the edge cache; emit both a request event and a cache event.
    //   (b) Everything else (blog, sitemap, assets, fonts, etc.) —
    //       passthrough to ASSETS, instrument only HTML responses.
    if (url.pathname !== "/") {
      if (isCacheableSsrPath(url.pathname)) {
        const { response, status: cacheStatus } = await fetchThroughCache(ctx, url, () =>
          env.ASSETS.fetch(request)
        );
        const locale = localeFromPath(url.pathname);
        // The locale-prefix paths (/fr/, /ja/) always return HTML —
        // ASSETS serves their index.html. No need to gate on the
        // body content-type; if for some reason it's not HTML the
        // cache layer will refuse to store it and the request still
        // works (no cache benefit, no breakage).
        emitMetric(
          ctx,
          env.ANALYTICS,
          response.status === 404 ? "404" : "direct_serve",
          locale,
          ua
        );
        emitCacheStatus(ctx, env.ANALYTICS, cacheStatus, locale, url.pathname);
        return withCacheStatusHeader(secureResponse(response, request), cacheStatus);
      }
      // Non-cacheable non-root: blog, assets, sitemap, robots.txt, etc.
      const response = await env.ASSETS.fetch(request);
      if (__isHtmlContentType(response)) {
        const event: EventType = response.status === 404 ? "404" : "direct_serve";
        emitMetric(ctx, env.ANALYTICS, event, localeFromPath(url.pathname), ua);
      }
      return secureResponse(response, request);
    }

    // From here we're on `/`. Bot bypass takes precedence — bots never
    // redirect and never go through the cache. The cardinality of
    // crawler UAs would dilute the cache (different UA strings might
    // be served different content if we cached) and crawler traffic
    // is rare enough that the SSR cost is irrelevant.
    if (BOT_UA.test(ua)) {
      emitMetric(ctx, env.ANALYTICS, "bot_bypass", "en", ua);
      emitCacheStatus(ctx, env.ANALYTICS, "BYPASS", "en", "/");
      const response = secureResponse(await env.ASSETS.fetch(request), request);
      return withCacheStatusHeader(response, "BYPASS");
    }

    // Cookie wins over Accept-Language (it represents an explicit user
    // choice set by the LanguageSwitcher).
    const cookieLocale = readLangCookie(request.headers.get("cookie"));
    const headerLocale = cookieLocale
      ? undefined
      : parseAcceptLanguage(request.headers.get("accept-language") ?? "");

    const chosen: Locale = cookieLocale ?? headerLocale ?? DEFAULT_LOCALE;

    if (chosen !== DEFAULT_LOCALE) {
      const location = new URL(`/${chosen}/`, url.origin).toString();
      // 302 has no body, so no CSP nonce needed — apply only the static
      // security headers. Existing Location / Vary / Cache-Control are
      // preserved by applySecurityHeaders (merge, not overwrite).
      // Redirects are NOT cached: compute cost is trivial and caching
      // would have to fragment by Accept-Language anyway, defeating the
      // point.
      const redirect = new Response(null, {
        status: 302,
        headers: {
          Location: location,
          Vary: "Accept-Language, Cookie",
          // Don't cache the redirect — it depends on per-request headers.
          "Cache-Control": "no-cache",
        },
      });
      emitMetric(ctx, env.ANALYTICS, "redirect_locale", chosen, ua);
      return applySecurityHeaders(redirect, request);
    }

    // Default-locale `/` serve. This is the hot path: a human visitor
    // with no cookie and an Accept-Language that picks EN (or none at
    // all). We go through the cache here — the body is identical for
    // every such visitor, only the CSP nonce varies.
    const { response: cached, status: cacheStatus } = await fetchThroughCache(ctx, url, () =>
      env.ASSETS.fetch(request)
    );

    // Vary is mandatory on `/` (browser-side caching correctness for
    // the few clients that respect it). Set BEFORE secureResponse so
    // applySecurityHeaders preserves it via the merge contract.
    const withVary = new Response(cached.body, {
      status: cached.status,
      statusText: cached.statusText,
      headers: new Headers(cached.headers),
    });
    withVary.headers.set("Vary", "Accept-Language, Cookie");

    emitMetric(ctx, env.ANALYTICS, "direct_serve", "en", ua);
    emitCacheStatus(ctx, env.ANALYTICS, cacheStatus, "en", "/");
    return withCacheStatusHeader(secureResponse(withVary, request), cacheStatus);
  },
};
