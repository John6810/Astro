# Security Response Headers

All HTTP responses from this site carry a fixed set of security headers
applied by the Cloudflare Worker (`worker/index.ts`) via the helper in
`worker/security-headers.ts`. HTML responses additionally get a
Content-Security-Policy bound to a per-request nonce.

## Header inventory

| Header                       | Value                                                          | Why                                                                                                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Strict-Transport-Security`  | `max-age=63072000; includeSubDomains; preload`                 | 2-year HSTS, opted in to the browser preload list. Forces every visitor on every subdomain over HTTPS, no negotiation.                                                                                             |
| `X-Content-Type-Options`     | `nosniff`                                                      | Stops the browser from MIME-sniffing a response away from its declared `Content-Type`. Blocks the most common XSS-via-MIME-confusion class.                                                                        |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                              | Sends a full referrer on same-origin navigation, origin-only across origins, and nothing when downgrading from HTTPS to HTTP. Standard modern default.                                                             |
| `Permissions-Policy`         | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Explicitly denies sensor APIs the site never uses, plus opts out of FLoC / Topics.                                                                                                                                 |
| `X-Frame-Options`            | `DENY`                                                         | Legacy clickjacking defence. Redundant with `frame-ancestors 'none'` in CSP for modern browsers, kept for the long-tail.                                                                                           |
| `Cross-Origin-Opener-Policy` | `same-origin`                                                  | Isolates the top-level browsing context. Enables `crossOriginIsolated` for any future feature that wants `SharedArrayBuffer` / high-resolution timers without exposing the site to cross-origin window references. |
| `Content-Security-Policy`    | see below                                                      | Restricts where scripts, styles, images, fonts, connections can come from. The single biggest XSS mitigation we have.                                                                                              |

## CSP strategy: nonce-based

We chose a **nonce per request** over hash-pinning.

**Inline content audit** (run on the SSR output of `/`):

- 4 inline `<script>` blocks: JSON-LD, the theme bootstrap, two
  `type="module"` blocks emitted by Astro for component hydration.
- 1 inline `<style>` block: an Astro-scoped style with a generated
  `[data-astro-cid-…]` selector hash.
- 2 external scripts: the Astro hydration bundle at `/_astro/…js`
  (same-origin) and GoatCounter at `https://gc.zgo.at/count.js`.
- 0 inline `style="…"` attributes.

**Why not hashes**: Astro regenerates the component-scoped style hash
and the bundled module URLs on every build that touches a component.
Pinning hashes in CSP would require regenerating the CSP every release
and would silently break on every component edit until the hashes are
refreshed. Operational footgun.

**Why nonces**: the Worker generates a fresh 16-byte base64 nonce per
request, streams the HTML response through `HTMLRewriter` to stamp
`nonce="…"` on every `<script>` and `<style>` element, then sets a
`Content-Security-Policy` header that mentions the same nonce. Inline
content can change build-over-build without any CSP work.

The CSP we emit on HTML responses:

```
default-src 'self';
script-src  'self' 'nonce-…' https://gc.zgo.at;
style-src   'self' 'nonce-…';
img-src     'self' data: https:;
font-src    'self';
connect-src 'self' https://*.goatcounter.com;
frame-ancestors 'none';
base-uri    'self';
form-action 'self';
upgrade-insecure-requests
```

Notable choices:

- **No `'unsafe-inline'` on `script-src`** — nonces cover every inline
  script we emit.
- **No `'unsafe-inline'` on `style-src` either** — Astro's scoped
  `<style>` blocks get the nonce just like scripts. This was achievable
  here because the site doesn't ship inline `style="…"` attributes; if
  that changes in the future the choice has to be re-evaluated.
- **`https:` on `img-src`** — we link external company logos and the
  occasional inline `data:` URI (favicons).
- **`gc.zgo.at` is the only third-party host** in `script-src` /
  `connect-src` — both originate from the GoatCounter analytics
  loader.
- **`frame-ancestors 'none'`** is the modern, CSP-level clickjacking
  defence; `X-Frame-Options: DENY` stays as legacy fallback.

CSP is set **only on HTML responses**. Static assets (images, fonts,
sitemap XML, `.md` agent routes) receive the other six security
headers but no CSP — CSP doesn't apply to non-document responses
and emitting it would needlessly bloat the response.

## Application path

```
fetch(request)
 ├── url.pathname !== "/"           -> secureResponse(env.ASSETS.fetch(request))
 ├── bot UA on "/"                  -> secureResponse(env.ASSETS.fetch(request))
 ├── locale != en on "/"            -> applySecurityHeaders(302 redirect)
 └── default-locale serve on "/"    -> secureResponse(env.ASSETS.fetch(request) + Vary)
```

`secureResponse(response, request)` is the common entry: it sniffs the
response `Content-Type`, runs `HTMLRewriter` + nonce only on HTML, and
calls `applySecurityHeaders` either way.

`applySecurityHeaders` **merges** the static headers onto the response.
Existing `Vary`, `Cache-Control`, `Content-Type`, `Location` are
preserved verbatim — the locale redirect keeps its
`Vary: Accept-Language, Cookie` + `Cache-Control: no-cache`, and the
`/` default-locale response keeps `Vary: Accept-Language, Cookie`.

## Layout-side cleanup

The previous deploy carried a meta-tag CSP in each layout:

```html
<meta http-equiv="Content-Security-Policy" content="… 'unsafe-inline' …" />
```

That tag is removed in the same PR. Two CSPs (header + meta) get
intersected by browsers, so a permissive meta would never relax the
strict worker-injected one; the meta would only add maintenance
burden. The worker header is now the single source of truth.

## Verifying

```bash
HOST=https://jonathan-aerts.dev

# All seven headers on the root document
curl -sI "$HOST/"

# 302 still carries the redirect contract + security headers
curl -sI -H "Accept-Language: fr-BE,fr;q=0.9" "$HOST/"

# Bot path: 200, no redirect, security headers present
curl -sI -A "ClaudeBot/1.0" "$HOST/"

# /fr/ and /ja/ get the headers but NO Vary
curl -sI "$HOST/fr/"
curl -sI "$HOST/ja/"

# Static assets: 6 headers, no CSP
curl -sI "$HOST/favicon-32x32.png"

# Run the full audit
open "https://securityheaders.com/?q=$HOST&followRedirects=on&hideResults=on"
```

In browser DevTools the Console should show zero CSP violations on
`/`, `/fr/`, `/ja/` and any blog page.

## Future tightening

- `Cross-Origin-Embed-Policy: require-corp` would unlock
  `crossOriginIsolated` features but currently breaks GoatCounter
  because their loader doesn't set CORP. Defer.
- `Cross-Origin-Resource-Policy: same-origin` would prevent any other
  origin embedding our static assets. Slight risk for legitimate uses
  (RSS readers, mirrors), so deferred.
- `Report-To` / `report-uri` to capture CSP violations server-side.
  No reporting endpoint configured today; would need a Worker route
  or third-party CSP collector.
