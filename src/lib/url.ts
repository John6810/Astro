/**
 * Prefix an absolute path with the configured `base`.
 *
 * Astro v6 doesn't auto-rewrite `href="/foo"` strings in templates — only
 * its own injected bundles. Use this helper for any internal href/src that
 * starts with `/` so the site works under a subpath (e.g. GitHub Pages).
 *
 * Examples (with base = "/Astro/"):
 *   withBase("/recruiter")            -> "/Astro/recruiter"
 *   withBase("/images/avatar.jpg")    -> "/Astro/images/avatar.jpg"
 *   withBase("https://example.com")   -> "https://example.com" (untouched)
 *   withBase("#anchor")               -> "#anchor"             (untouched)
 */
export function withBase(path: string): string {
  if (!path.startsWith("/")) return path;
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  return `${base}${path}`;
}

/** Absolute site URL (origin + base, no trailing slash). */
export function siteOrigin(): string {
  const site = (import.meta.env.SITE ?? "").replace(/\/+$/, "");
  const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
  return `${site}${base}`;
}
