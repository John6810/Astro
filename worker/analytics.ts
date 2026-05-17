// Workers Analytics Engine instrumentation.
//
// One datapoint per request, recorded fire-and-forget on the `ANALYTICS`
// binding declared in wrangler.jsonc. The dataset is queryable via SQL —
// see docs/analytics-queries.md.
//
// Schema:
//   blobs:   [event_type, locale, user_agent_class]   ← strings, low-card
//   doubles: [1]                                       ← request counter
//   indexes: [event_type]                              ← partitioned for cheap filter
//
// Privacy:
//   - The full User-Agent string is NEVER recorded — only a coarse
//     classification (`human` / `bot_ai` / `bot_search` / `unknown`).
//   - No IP, no Cookie, no Referer.
//
// Quota: Analytics Engine free tier is 10M datapoints / month — at ~1
// datapoint per request that maps to roughly 3.85 req/sec sustained,
// far above any realistic portfolio traffic.

export type EventType = "redirect_locale" | "direct_serve" | "bot_bypass" | "404";
export type AnalyticsLocale = "en" | "fr" | "ja" | "unknown";
export type UserAgentClass = "human" | "bot_ai" | "bot_search" | "unknown";

// Same lists used by the redirect bypass in worker/index.ts plus a
// broader search bucket. Kept here so analytics classification doesn't
// drift from the actual bypass logic — they share the AI list verbatim.
const AI_BOT_UA = /ClaudeBot|Claude-Web|anthropic-ai|GPTBot|PerplexityBot|Google-Extended|CCBot/i;

// Search engines, link-preview crawlers, social-card fetchers — bucketed
// together as `bot_search` because for analytics purposes they all
// behave like indexers, not interactive users.
const SEARCH_BOT_UA =
  /Googlebot|Bingbot|DuckDuckBot|YandexBot|Baiduspider|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|TelegramBot|WhatsApp/i;

/**
 * Coarse-grained classification of a User-Agent header.
 *
 * Returns `"unknown"` for an empty string. Anything that doesn't match
 * either bot regex is classified as `"human"` — we don't try to fingerprint
 * subtleties (no "is this a real browser?" heuristic).
 */
export function classifyUserAgent(ua: string): UserAgentClass {
  if (!ua) return "unknown";
  if (AI_BOT_UA.test(ua)) return "bot_ai";
  if (SEARCH_BOT_UA.test(ua)) return "bot_search";
  return "human";
}

/**
 * Derive the analytics-side locale label from a request path.
 *
 * `/fr/...` and `/ja/...` map to their respective locales; everything
 * else (the default-locale root, blog, sitemap, assets, etc.) maps to
 * `"en"`. Used for the `direct_serve` and `404` events where the
 * routing layer doesn't already know the chosen locale.
 */
export function localeFromPath(pathname: string): AnalyticsLocale {
  if (pathname === "/fr" || pathname.startsWith("/fr/")) return "fr";
  if (pathname === "/ja" || pathname.startsWith("/ja/")) return "ja";
  return "en";
}

/**
 * Write a single datapoint to the analytics dataset.
 *
 * Synchronous and non-throwing — Analytics Engine handles batching on
 * its side, so a call doesn't block the response. We still wrap in a
 * try/catch defensively: a misbehaving binding must never break the
 * request.
 *
 * The `dataset` argument is typed `| undefined` because the binding is
 * declared optional in tests where the pool doesn't provision it. In
 * production wrangler.jsonc always provides it.
 */
export function recordRequest(
  dataset: AnalyticsEngineDataset | undefined,
  event: EventType,
  locale: AnalyticsLocale,
  userAgentClass: UserAgentClass
): void {
  if (!dataset) return;
  try {
    dataset.writeDataPoint({
      blobs: [event, locale, userAgentClass],
      doubles: [1],
      indexes: [event],
    });
  } catch {
    // Analytics must never break a request.
  }
}
