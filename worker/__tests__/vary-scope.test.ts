// Vary header scoping — present ONLY on /, never on any other path.
// Setting Vary anywhere else would force the CDN to keep per-locale
// variants of every static asset, defeating the cache.

import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const ORIGIN = "https://example.com";

async function vary(path: string, headers?: Record<string, string>): Promise<string | null> {
  const res = await SELF.fetch(`${ORIGIN}${path}`, { headers, redirect: "manual" });
  return res.headers.get("vary");
}

describe("Vary scope", () => {
  it("/ has Vary: Accept-Language, Cookie (default-locale serve)", async () => {
    const v = await vary("/", { "Accept-Language": "en-US" });
    expect(v).toBe("Accept-Language, Cookie");
  });

  it("/ has Vary: Accept-Language, Cookie on the 302 redirect too", async () => {
    const v = await vary("/", { "Accept-Language": "fr-BE,fr;q=0.9" });
    expect(v).toBe("Accept-Language, Cookie");
  });

  it("/fr/ has NO Vary", async () => {
    expect(await vary("/fr/")).toBeNull();
  });

  it("/ja/ has NO Vary", async () => {
    expect(await vary("/ja/")).toBeNull();
  });

  it("/blog/ has NO Vary", async () => {
    expect(await vary("/blog/")).toBeNull();
  });

  it("/sitemap-index.xml has NO Vary", async () => {
    expect(await vary("/sitemap-index.xml")).toBeNull();
  });

  it("/favicon-32x32.png has NO Vary", async () => {
    expect(await vary("/favicon-32x32.png")).toBeNull();
  });

  it("/llms.txt has NO Vary", async () => {
    expect(await vary("/llms.txt")).toBeNull();
  });

  it("/index.md has NO Vary", async () => {
    expect(await vary("/index.md")).toBeNull();
  });

  it("an unknown path has NO Vary (404)", async () => {
    expect(await vary("/does-not-exist-abc123")).toBeNull();
  });
});
