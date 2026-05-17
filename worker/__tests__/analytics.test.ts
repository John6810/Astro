// Unit tests for the Analytics Engine instrumentation helpers.
// classifyUserAgent + localeFromPath + extractDomain are pure
// functions; recordRequest + recordCspViolation are tested with a
// manual mock so we don't need a real ANALYTICS binding.

import { describe, expect, it, vi } from "vitest";
import {
  classifyUserAgent,
  extractDomain,
  localeFromPath,
  recordCspViolation,
  recordRequest,
  type AnalyticsLocale,
  type EventType,
  type UserAgentClass,
} from "../analytics";

describe("classifyUserAgent", () => {
  it.each<[string, UserAgentClass]>([
    // Empty / missing
    ["", "unknown"],
    // AI / LLM crawlers
    ["ClaudeBot/1.0", "bot_ai"],
    ["Mozilla/5.0 (compatible; ClaudeBot/1.0)", "bot_ai"],
    ["Claude-Web/0.5", "bot_ai"],
    ["anthropic-ai/1.0", "bot_ai"],
    ["GPTBot/1.2 (+https://openai.com/gptbot)", "bot_ai"],
    ["PerplexityBot/1.0", "bot_ai"],
    ["Mozilla/5.0 (compatible; Google-Extended/1.0)", "bot_ai"],
    ["CCBot/2.0", "bot_ai"],
    // Search + link-preview crawlers
    ["Googlebot/2.1 (+http://www.google.com/bot.html)", "bot_search"],
    ["Bingbot/2.0", "bot_search"],
    ["DuckDuckBot/1.1", "bot_search"],
    ["YandexBot/3.0", "bot_search"],
    ["facebookexternalhit/1.1", "bot_search"],
    ["Twitterbot/1.0", "bot_search"],
    ["LinkedInBot/1.0", "bot_search"],
    // Real browsers — anything not matching either bot regex
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15", "human"],
    ["curl/8.4.0", "human"],
    ["PostmanRuntime/7.36.0", "human"],
  ])("classifies %j as %s", (ua, expected) => {
    expect(classifyUserAgent(ua)).toBe(expected);
  });
});

describe("localeFromPath", () => {
  it.each<[string, AnalyticsLocale]>([
    ["/", "en"],
    ["/blog/", "en"],
    ["/blog/some-post/", "en"],
    ["/sitemap-index.xml", "en"],
    ["/llms.txt", "en"],
    ["/favicon-32x32.png", "en"],
    ["/fr/", "fr"],
    ["/fr/blog/", "fr"],
    ["/fr", "fr"],
    ["/ja/", "ja"],
    ["/ja", "ja"],
    ["/ja/blog/some-post/", "ja"],
    // The locale prefix matcher is strict: /freedom isn't /fr/
    ["/freedom-fries", "en"],
    ["/japanese", "en"],
  ])("derives locale %s from %j", (pathname, expected) => {
    expect(localeFromPath(pathname)).toBe(expected);
  });
});

describe("recordRequest", () => {
  function makeMockDataset() {
    return { writeDataPoint: vi.fn() };
  }

  it("calls writeDataPoint with the expected schema", () => {
    const dataset = makeMockDataset();
    recordRequest(dataset as unknown as AnalyticsEngineDataset, "direct_serve", "en", "human");
    expect(dataset.writeDataPoint).toHaveBeenCalledTimes(1);
    expect(dataset.writeDataPoint).toHaveBeenCalledWith({
      blobs: ["direct_serve", "en", "human"],
      doubles: [1],
      indexes: ["direct_serve"],
    });
  });

  it.each<[Exclude<EventType, "csp_violation">, AnalyticsLocale, UserAgentClass]>([
    ["redirect_locale", "fr", "human"],
    ["redirect_locale", "ja", "human"],
    ["bot_bypass", "en", "bot_ai"],
    ["bot_bypass", "en", "bot_search"],
    ["404", "en", "human"],
    ["direct_serve", "fr", "human"],
    ["direct_serve", "ja", "unknown"],
  ])("propagates %s + %s + %s through to the dataset", (event, locale, ua) => {
    const dataset = makeMockDataset();
    recordRequest(dataset as unknown as AnalyticsEngineDataset, event, locale, ua);
    expect(dataset.writeDataPoint).toHaveBeenCalledWith({
      blobs: [event, locale, ua],
      doubles: [1],
      indexes: [event],
    });
  });

  it("is a no-op when dataset is undefined (test pool case)", () => {
    expect(() => recordRequest(undefined, "direct_serve", "en", "human")).not.toThrow();
  });

  it("swallows writeDataPoint errors so the request is never broken", () => {
    const dataset = {
      writeDataPoint: vi.fn(() => {
        throw new Error("upstream binding down");
      }),
    };
    expect(() =>
      recordRequest(dataset as unknown as AnalyticsEngineDataset, "direct_serve", "en", "human")
    ).not.toThrow();
    expect(dataset.writeDataPoint).toHaveBeenCalledTimes(1);
  });
});

describe("extractDomain", () => {
  it.each<[string | null | undefined, string]>([
    // Empty / nullish → unparseable
    [undefined, "unparseable"],
    [null, "unparseable"],
    ["", "unparseable"],
    // CSP keyword tokens preserved verbatim
    ["inline", "inline"],
    ["eval", "eval"],
    ["self", "self"],
    ["unsafe-inline", "unsafe-inline"],
    ["unsafe-eval", "unsafe-eval"],
    ["wasm-unsafe-eval", "wasm-unsafe-eval"],
    // Opaque schemes → scheme-only bucket (drop the payload)
    ["data:image/png;base64,iVBORw0KGgo", "data:"],
    ["blob:https://example.com/0e7c-c0ffee", "blob:"],
    ["filesystem:https://example.com/temporary/foo.png", "filesystem:"],
    ["about:blank", "about:"],
    ["chrome-extension://abc/popup.html", "chrome-extension:"],
    // Real http(s) → bare hostname
    ["https://evil.example/x.js", "evil.example"],
    ["http://google-analytics.com/collect?v=1", "google-analytics.com"],
    ["https://cdn.example.org:8443/lib.js", "cdn.example.org"],
    // Malformed → unparseable
    ["not a uri", "unparseable"],
    // file: scheme has no host; we don't bucket it, so hostname is
    // empty and the fallback kicks in.
    ["file:///etc/hosts", "unparseable"],
  ])("extractDomain(%j) === %j", (input, expected) => {
    expect(extractDomain(input)).toBe(expected);
  });
});

describe("recordCspViolation", () => {
  function makeMockDataset() {
    return { writeDataPoint: vi.fn() };
  }

  it("writes the overloaded blob layout", () => {
    const ds = makeMockDataset();
    recordCspViolation(ds as unknown as AnalyticsEngineDataset, "script-src", "evil.example");
    expect(ds.writeDataPoint).toHaveBeenCalledWith({
      blobs: ["csp_violation", "script-src", "evil.example"],
      doubles: [1],
      indexes: ["csp_violation"],
    });
  });

  it.each([
    ["style-src", "inline"],
    ["img-src", "data:"],
    ["script-src", "unparseable"],
    ["unknown", "self"],
  ])("propagates (%s, %s)", (directive, domain) => {
    const ds = makeMockDataset();
    recordCspViolation(ds as unknown as AnalyticsEngineDataset, directive, domain);
    expect(ds.writeDataPoint).toHaveBeenCalledWith({
      blobs: ["csp_violation", directive, domain],
      doubles: [1],
      indexes: ["csp_violation"],
    });
  });

  it("is a no-op when dataset is undefined", () => {
    expect(() => recordCspViolation(undefined, "script-src", "x.test")).not.toThrow();
  });

  it("swallows writeDataPoint errors", () => {
    const ds = {
      writeDataPoint: vi.fn(() => {
        throw new Error("AE down");
      }),
    };
    expect(() =>
      recordCspViolation(ds as unknown as AnalyticsEngineDataset, "script-src", "x.test")
    ).not.toThrow();
  });
});
