import type { APIContext } from "astro";

// Dynamic robots.txt — sitemap URL is built from Astro.site + base at build
// time so it stays correct across domain/base changes (GH Pages subpath vs.
// apex domain). Same `text/plain` Content-Type as a static public/robots.txt
// would emit. Policy: open to all crawlers, with an explicit allow-list for
// known AI agents (visibility > paranoia — the site is meant to be scraped
// by recruiter LLMs).
export function GET(context: APIContext) {
  const aiBots = [
    "GPTBot",
    "ClaudeBot",
    "Claude-Web",
    "PerplexityBot",
    "Google-Extended",
    "CCBot",
    "anthropic-ai",
  ];

  const explicitAllows = aiBots.map((ua) => `User-agent: ${ua}\nAllow: /\n`).join("\n");

  let body = `User-agent: *\nAllow: /\n\n# Explicit allow for AI crawlers — content is intended for sourcing agents and recruiters\n${explicitAllows}`;

  if (context.site) {
    const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
    const sitemap = new URL(`${base}/sitemap-index.xml`, context.site).toString();
    body += `\nSitemap: ${sitemap}\n`;
  }

  return new Response(body, { headers: { "Content-Type": "text/plain" } });
}
