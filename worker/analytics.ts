// Workers Analytics Engine instrumentation.
//
// One datapoint per *meaningful* request, recorded fire-and-forget on
// the `ANALYTICS` binding declared in wrangler.jsonc. The dataset is
// queryable via SQL — see docs/analytics-queries.md.
//
// "Meaningful" excludes:
//   - Static asset fetches (images, fonts, CSS, JS, XML, txt) — filtered
//     by Content-Type on the producer side in worker/index.ts. Only
//     responses whose Content-Type starts with `text/html` are recorded.
//   - The /version endpoint (ops only, not user traffic).
//
// CSP violation reports get their own event type with a distinct blob
// layout (directive + blocked domain instead of locale + UA class).
//
// Schema (per-event):
//   Request events (redirect_locale | direct_serve | bot_bypass | 404):
//     blobs:   [event_type, locale, user_agent_class]
//     doubles: [1]
//     indexes: [event_type]
//
//   CSP violation events (csp_violation):
//     blobs:   [event_type, directive, blocked_domain]
//     doubles: [1]
//     indexes: [event_type]
//
// The schema overload is documented in docs/analytics-queries.md so
// querier knows blob2/blob3 mean different things per event_type.
//
// Privacy:
//   - The full User-Agent string is NEVER recorded — only a coarse
//     classification (`human` / `bot_ai` / `bot_search` / `unknown`).
//   - CSP report URIs are reduced to a bare hostname (or scheme for
//     opaque schemes like `data:`/`inline`); the full URI is dropped.
//   - No IP, no Cookie, no Referer.
//
// Quota: Analytics Engine free tier is 10M datapoints / month — at ~1
// datapoint per *HTML* request that maps to well above realistic
// portfolio traffic.

export type EventType = "redirect_locale" | "direct_serve" | "bot_bypass" | "404" | "csp_violation";
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
 * Reduce a CSP `blocked-uri` field to a low-cardinality, PII-free token.
 *
 * The intent is to bucket violations by *origin* so the analytics
 * dataset stays small (a Worker can field millions of CSP reports
 * across a long tail of attacker domains; we don't need each one).
 *
 * Behavior:
 *   - Opaque CSP tokens (`inline`, `eval`, `self`, `unsafe-inline`,
 *     `unsafe-eval`, `wasm-unsafe-eval`) → returned verbatim. These are
 *     not URIs but appear in real reports.
 *   - URI with scheme-but-no-host (`data:`, `blob:`, `filesystem:`,
 *     `about:`, `chrome-extension:`) → returns `<scheme>:` so the
 *     scheme is preserved without leaking blob hashes / base64 payloads.
 *   - Valid http(s) URI → returns the hostname.
 *   - Unparseable / empty → returns `"unparseable"`.
 *
 * The full URI is NEVER returned — that's the privacy contract.
 */
export function extractDomain(blockedUri: string | undefined | null): string {
  if (!blockedUri) return "unparseable";

  // CSP keyword tokens that are not URIs.
  const KEYWORD_SET = new Set([
    "inline",
    "eval",
    "self",
    "unsafe-inline",
    "unsafe-eval",
    "wasm-unsafe-eval",
  ]);
  if (KEYWORD_SET.has(blockedUri)) return blockedUri;

  // Opaque schemes — keep the scheme, drop the payload (which could be
  // base64 / hash / extension ID — all unbounded cardinality).
  const OPAQUE_SCHEMES = ["data:", "blob:", "filesystem:", "about:", "chrome-extension:"];
  for (const scheme of OPAQUE_SCHEMES) {
    if (blockedUri.startsWith(scheme)) return scheme;
  }

  try {
    return new URL(blockedUri).hostname || "unparseable";
  } catch {
    return "unparseable";
  }
}

/**
 * Write a single request-event datapoint to the analytics dataset.
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
  event: Exclude<EventType, "csp_violation">,
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

/**
 * Write a CSP violation datapoint.
 *
 * The schema overloads blob2/blob3:
 *   blob2 = the violated directive (e.g. `"script-src"`)
 *   blob3 = the reduced blocked domain (see extractDomain)
 *
 * This lets a single dataset hold both request and security events
 * without doubling the binding count. Querier discriminates via
 * `blob1 = 'csp_violation'` (also available via the `index1` partition).
 */
export function recordCspViolation(
  dataset: AnalyticsEngineDataset | undefined,
  directive: string,
  blockedDomain: string
): void {
  if (!dataset) return;
  try {
    dataset.writeDataPoint({
      blobs: ["csp_violation", directive, blockedDomain],
      doubles: [1],
      indexes: ["csp_violation"],
    });
  } catch {
    // Same defensive contract as recordRequest.
  }
}
