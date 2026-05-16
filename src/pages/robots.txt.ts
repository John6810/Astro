import type { APIContext } from "astro";

// Dynamic robots.txt — sitemap URL is built from Astro.site + base at build time
// so it stays correct across domain/base changes (GH Pages subpath vs. apex domain).
export function GET(context: APIContext) {
  const site = context.site;
  if (!site) {
    return new Response("User-agent: *\nAllow: /\n", {
      headers: { "Content-Type": "text/plain" },
    });
  }

  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  const sitemap = new URL(`${base}/sitemap-index.xml`, site).toString();

  const body = `User-agent: *
Allow: /

Sitemap: ${sitemap}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
}
