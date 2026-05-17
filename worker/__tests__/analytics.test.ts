// Unit tests for the Analytics Engine instrumentation helpers.
// classifyUserAgent + localeFromPath are pure functions; recordRequest is
// tested with a manual mock so we don't need a real ANALYTICS binding.

import { describe, expect, it, vi } from "vitest";
import {
  classifyUserAgent,
  localeFromPath,
  recordRequest,
  type EventType,
  type AnalyticsLocale,
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

  it.each<[EventType, AnalyticsLocale, UserAgentClass]>([
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
