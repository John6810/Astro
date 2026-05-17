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

export interface Env {
  ASSETS: Fetcher;
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
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only the root path participates in the negotiation. Every other URL
    // (assets, /fr/, /ja/, /blog/*, .md routes, sitemap, etc.) goes straight
    // through to the static asset binding with its own headers — no Vary
    // contamination, no extra logic.
    if (url.pathname !== "/") {
      return env.ASSETS.fetch(request);
    }

    const ua = request.headers.get("user-agent") ?? "";

    // Bots: never redirect. Serve the EN body directly so crawlers ingest
    // English content deterministically without following 302s, and without
    // leaking locale negotiation into their caching.
    if (BOT_UA.test(ua)) {
      return env.ASSETS.fetch(request);
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
      return new Response(null, {
        status: 302,
        headers: {
          Location: location,
          Vary: "Accept-Language, Cookie",
          // Don't cache the redirect — it depends on per-request headers.
          "Cache-Control": "no-cache",
        },
      });
    }

    // Serve EN body via the static asset, then mark Vary so the CDN keeps
    // language variants separate. The body is otherwise unmodified.
    const upstream = await env.ASSETS.fetch(request);
    const headers = new Headers(upstream.headers);
    headers.set("Vary", "Accept-Language, Cookie");
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  },
};
