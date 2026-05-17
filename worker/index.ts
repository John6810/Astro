// Edge Worker — minimal Accept-Language redirect logic, then fall through
// to the static asset binding for everything else.
//
// Why this exists:
//   - Astro middleware does not run at request time in `output: "static"`
//     mode (only at build).
//   - The recruiter home is meant to land in English by default for AI
//     crawlers (Claude/GPT/Perplexity/etc.), but human visitors with a
//     non-English Accept-Language should be redirected to the matching
//     localized page (/fr/ or /ja/).
//
// Routing decision (only on `/`):
//   1. If User-Agent matches the bot regex -> serve /index.html (EN). No
//      redirect, no Vary contamination.
//   2. Else, look for an explicit `lang=<code>` cookie set by the
//      LanguageSwitcher. If present, honor it (302 to /<code>/ unless it
//      already equals the default locale).
//   3. Else, parse Accept-Language. If best match is fr or ja, 302 to
//      that locale; otherwise serve EN.
//
// `Vary: Accept-Language, Cookie` is attached ONLY to responses for `/`
// so the CDN can cache the three possible answers (EN body, 302 to /fr/,
// 302 to /ja/) per language preference without poisoning the cache of
// every static asset.

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
export function parseAcceptLanguage(header: string): Locale | undefined {
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

function targetPath(loc: Locale): string {
  return loc === DEFAULT_LOCALE ? "/" : `/${loc}/`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only the root path participates in the language negotiation. Every
    // other URL (assets, /fr/, /ja/, /blog/, .md routes, etc.) goes
    // straight to the static asset binding with its own headers.
    if (url.pathname !== "/") {
      return env.ASSETS.fetch(request);
    }

    const ua = request.headers.get("user-agent") ?? "";

    // Bots: never redirect. Serve the EN body directly so crawlers ingest
    // English content deterministically without following 302s and
    // without leaking locale negotiation into their caching.
    if (BOT_UA.test(ua)) {
      const resp = await env.ASSETS.fetch(request);
      // We do NOT set Vary here — bot responses are deterministic by path.
      return resp;
    }

    // Cookie wins over Accept-Language (it represents an explicit user choice
    // set by the LanguageSwitcher).
    const cookieLocale = readLangCookie(request.headers.get("cookie"));
    const headerLocale = cookieLocale
      ? undefined
      : parseAcceptLanguage(request.headers.get("accept-language") ?? "");

    const chosen: Locale = cookieLocale ?? headerLocale ?? DEFAULT_LOCALE;

    if (chosen !== DEFAULT_LOCALE) {
      const location = new URL(targetPath(chosen), url.origin).toString();
      return new Response(null, {
        status: 302,
        headers: {
          Location: location,
          Vary: "Accept-Language, Cookie",
          // Don't cache the redirect — it depends on Accept-Language/cookie.
          "Cache-Control": "no-cache",
        },
      });
    }

    // Serve EN body, but mark it Vary so the CDN doesn't cache it for
    // visitors who would have been redirected.
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
