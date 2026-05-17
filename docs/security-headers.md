# Security Response Headers

All HTTP responses from this site carry a fixed set of security headers
applied by the Cloudflare Worker (`worker/index.ts`) via the helper in
`worker/security-headers.ts`. HTML responses additionally get a
Content-Security-Policy bound to a per-request nonce, plus a
`Reporting-Endpoints` header that wires CSP violation reports back to
the same Worker.

## Header inventory

| Header                                  | Value                                                          | Why                                                                                                                                                                                                                |
| --------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Strict-Transport-Security`             | `max-age=63072000; includeSubDomains; preload`                 | 2-year HSTS, opted in to the browser preload list. Forces every visitor on every subdomain over HTTPS, no negotiation.                                                                                             |
| `X-Content-Type-Options`                | `nosniff`                                                      | Stops the browser from MIME-sniffing a response away from its declared `Content-Type`. Blocks the most common XSS-via-MIME-confusion class.                                                                        |
| `Referrer-Policy`                       | `strict-origin-when-cross-origin`                              | Sends a full referrer on same-origin navigation, origin-only across origins, and nothing when downgrading from HTTPS to HTTP. Standard modern default.                                                             |
| `Permissions-Policy`                    | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Explicitly denies sensor APIs the site never uses, plus opts out of FLoC / Topics.                                                                                                                                 |
| `X-Frame-Options`                       | `DENY`                                                         | Legacy clickjacking defence. Redundant with `frame-ancestors 'none'` in CSP for modern browsers, kept for the long-tail.                                                                                           |
| `Cross-Origin-Opener-Policy`            | `same-origin`                                                  | Isolates the top-level browsing context. Enables `crossOriginIsolated` for any future feature that wants `SharedArrayBuffer` / high-resolution timers without exposing the site to cross-origin window references. |
| `Reporting-Endpoints` _(HTML only)_     | `csp-endpoint="https://jonathan-aerts.dev/csp-report"`         | Declares the Reporting API endpoint that CSP `report-to` refers to.                                                                                                                                                |
| `Content-Security-Policy` _(HTML only)_ | see below                                                      | Restricts where scripts, styles, images, fonts, connections can come from. The single biggest XSS mitigation we have.                                                                                              |

## CSP strategy: nonce-based + `'strict-dynamic'`

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
script-src  'self' 'nonce-…' 'strict-dynamic' https://gc.zgo.at;
style-src   'self' 'nonce-…';
img-src     'self' data: https:;
font-src    'self';
connect-src 'self' https://*.goatcounter.com;
frame-ancestors 'none';
object-src 'none';
base-uri    'self';
form-action 'self';
upgrade-insecure-requests;
report-to   csp-endpoint;
report-uri  /csp-report
```

### Notable choices

- **No `'unsafe-inline'` on `script-src`** — nonces cover every inline
  script we emit.
- **No `'unsafe-inline'` on `style-src` either** — Astro's scoped
  `<style>` blocks get the nonce just like scripts. This was achievable
  here because the site doesn't ship inline `style="…"` attributes; if
  that changes in the future the choice has to be re-evaluated.
- **`'strict-dynamic'` on `script-src`** — modern browsers (CSP3) trust
  scripts that the nonced bootstrap dynamically inserts (Astro
  hydration islands). The `'self'` + `https://gc.zgo.at` entries
  become a fallback that older browsers honour. See the
  _strict-dynamic experiment_ section below for the cross-browser
  outcome.
- **`object-src 'none'`** — explicit forbid of `<object>` / `<embed>` /
  `<applet>`. Some scanners flag the absence even though
  `default-src 'self'` already restricts these; the explicit directive
  makes the intent unambiguous.
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

## `'strict-dynamic'` experiment outcome

`'strict-dynamic'` is layered on `script-src`. The experiment success
criteria (from the spec):

1. GoatCounter loader fetches `gc.zgo.at/count.js`
2. GoatCounter beacon fires (count ping to `*.goatcounter.com`)
3. Astro hydration works (interactive components respond)
4. Zero CSP errors in the browser console on `/`, `/fr/`, `/ja/`

All four are continuously validated by the Playwright E2E suite
(`tests/e2e/acceptance.spec.ts`, group **"CSP live behaviour"**), which
runs against the CF Workers Builds preview on every PR in both
Chromium and Firefox. A failure on any of these tests is the trigger
to revert `'strict-dynamic'`.

The directive is **kept** as long as the E2E suite stays green. If a
future browser update breaks one of the conditions:

- The single-line revert is: drop `'strict-dynamic'` from
  `buildCsp()` in `worker/security-headers.ts`.
- The `'self'` + `https://gc.zgo.at` fallback in `script-src` keeps
  the site fully functional on the older policy.
- Document the failure (browser + version + which directive blocked
  what) in this section before merging the revert.

## CSP violation reporting flow

```
┌────────────────┐   CSP violation   ┌─────────────────────┐
│ Browser (live) │ ────────────────▶ │  /csp-report (POST) │
└────────────────┘                   │  worker/csp-report  │
                                     └──────────┬──────────┘
                                                │ console.log
                                                ▼
                                     ┌────────────────────┐
                                     │  Workers Logs       │
                                     │  wrangler tail      │
                                     └────────────────────┘
```

- Browsers send the report via `report-uri /csp-report` (legacy CSP2)
  or `report-to csp-endpoint` (modern CSP3, declared via the
  `Reporting-Endpoints` response header).
- The Worker intercepts `POST /csp-report` **before** the locale
  routing logic — it must not trigger Accept-Language redirects, must
  not set `Vary`, must not be served from `dist/`.
- Accepted content types: `application/csp-report`,
  `application/reports+json`. Anything else → `400`.
- Malformed or empty JSON body → `400`.
- Well-formed report → `204 No Content`, body logged via
  `console.log("[CSP-VIOLATION]", JSON.stringify(report))`.
- The handler **does not** add IP, UA, or any other identifier the
  browser hasn't already put in the report.

### Throttling

A misconfigured CSP could fire hundreds of reports per page load.
The handler throttles to **100 reports / minute / Worker isolate**
with a simple sliding-window counter. Past the cap, requests get
`429 Too Many Requests` and are dropped (no log line).

The cap is per-isolate, not global — Cloudflare may run many
isolates in parallel — but for log-flood mitigation this is enough.
The throttle state lives in module-level `let` bindings inside
`worker/csp-report.ts` and resets on isolate restart.

### Verifying a report end-to-end

```bash
# In one terminal: tail the Worker logs
pnpm wrangler:tail

# In another: synthesise a report
curl -X POST https://jonathan-aerts.dev/csp-report \
  -H "content-type: application/csp-report" \
  -d '{"csp-report":{"document-uri":"https://jonathan-aerts.dev/","violated-directive":"script-src","blocked-uri":"https://evil.example/"}}' \
  -w "%{http_code}\n"
# → 204

# `wrangler:tail` should print:
# [CSP-VIOLATION] {"csp-report":{"document-uri":"…","violated-directive":"…",…}}
```

## Layout-side cleanup

The previous deploy carried a meta-tag CSP in each layout:

```html
<meta http-equiv="Content-Security-Policy" content="… 'unsafe-inline' …" />
```

That tag is removed. Two CSPs (header + meta) get intersected by
browsers, so a permissive meta would never relax the strict
worker-injected one; the meta would only add maintenance burden. The
worker header is now the single source of truth.

## Verifying

```bash
HOST=https://jonathan-aerts.dev

# All seven headers on the root document
curl -sI "$HOST/"

# 302 still carries the redirect contract + 6 static headers (no CSP)
curl -sI -H "Accept-Language: fr-BE,fr;q=0.9" "$HOST/"

# Bot path: 200, no redirect, 7 headers present
curl -sI -A "ClaudeBot/1.0" "$HOST/"

# /fr/ and /ja/ get the 7 headers but NO Vary
curl -sI "$HOST/fr/"
curl -sI "$HOST/ja/"

# Static assets: 6 headers, no CSP
curl -sI "$HOST/favicon-32x32.png"

# /csp-report: 204 on a well-formed report
curl -X POST "$HOST/csp-report" \
  -H "content-type: application/csp-report" \
  -d '{"csp-report":{}}' -w "%{http_code}\n"

# Run the full audit
open "https://securityheaders.com/?q=$HOST&followRedirects=on&hideResults=on"
```

In browser DevTools the Console should show zero CSP violations on
`/`, `/fr/`, `/ja/` and any blog page. Continuous regression coverage
is provided by:

- `pnpm test` — unit tests on the Worker runtime (see `docs/testing.md`)
- `pnpm test:e2e` — Playwright E2E against a preview URL

## Future tightening

- `Cross-Origin-Embed-Policy: require-corp` would unlock
  `crossOriginIsolated` features but currently breaks GoatCounter
  because their loader doesn't set CORP. Defer.
- `Cross-Origin-Resource-Policy: same-origin` would prevent any other
  origin embedding our static assets. Slight risk for legitimate uses
  (RSS readers, mirrors), so deferred.
- Persistent storage for CSP violation reports (today: console-only,
  visible while a `wrangler tail` is open). Wire to a CF Logpush
  destination or to Sentry for retention.
