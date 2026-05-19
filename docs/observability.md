# Observability — overview

How we see what's happening in production. Five complementary
signals, each with a different audience and a different failure
mode it catches.

| Signal                    | Provider                    | What it measures                                                                                    | Cost      |
| ------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------- | --------- |
| Traffic events            | GoatCounter                 | Page views, referrers, top paths. Cookieless.                                                       | Free      |
| Core Web Vitals (RUM)     | Cloudflare Web Analytics    | LCP, INP, CLS, TTFB, FCP from real browsers. Country/device breakdown. Cookieless.                  | Free      |
| Custom server-side events | Workers Analytics Engine    | Locale routing breakdown, bot bypass count, CSP violations, edge cache outcomes. SQL queryable.     | Free tier |
| External availability     | Better Stack                | 12 synthetic HTTP probes from 5 regions: ACs, security headers, ops endpoints, RUM beacon liveness. | Free tier |
| Deployment drift          | `drift-check.yml` GH Action | Every 10 min: is `/version` SHA == `main` HEAD SHA? Catches silent CF Workers Build failures.       | Free      |

Detailed runbooks live in [`docs/monitoring.md`](./monitoring.md)
(synthetic monitors + drift detection) and
[`docs/analytics-queries.md`](./analytics-queries.md) (SQL recipes
for the AE dataset). This file is the top-level map.

## Cloudflare Web Analytics (RUM)

Provides Core Web Vitals from real visitors. Complements
GoatCounter (which only tracks traffic-style events). The two don't
overlap: GoatCounter answers _"how many visits"_, CF Web Analytics
answers _"how fast did those visits feel"_.

### Why Option B (manual snippet) and not Option A (automatic injection)

Cloudflare offers two install paths for Web Analytics:

| Option                  | What it is                                                                                                                                                                                                                                                      | Why we don't use it here                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Automatic**       | CF injects the beacon `<script>` into HTML responses **at the edge, after the Worker runs**. Toggle it on in the dashboard, nothing to ship in source.                                                                                                          | Conflicts with three things we deliberately layer on the response: HTMLRewriter (which stamps the per-request CSP nonce), `'strict-dynamic'` CSP (which makes the auto-injected script require the same nonce), and the Workers Cache API (which would cache a body that subsequently gets a foreign tag glued onto it, with subtle ordering issues). The failure modes are CSP-blocked-script (no RUM data, silent) or stamped-with-wrong-nonce after a cache hit (no RUM data, still silent). |
| **B — Manual** (chosen) | We render the beacon `<script>` from `src/components/BaseHead.astro`. It flows through every layer the Worker controls — HTMLRewriter stamps it like any other script, CSP allowlists its host, the cache stores it bare and the nonce is replayed on each hit. | Deterministic, testable in CI, debuggable from `view-source`. The cost is one line of source plus the CSP allowance in `worker/security-headers.ts`.                                                                                                                                                                                                                                                                                                                                            |

If you're tempted to "just turn on Option A to save a few lines",
keep in mind that PR #38 tests
([`tests/e2e/acceptance.spec.ts`](../tests/e2e/acceptance.spec.ts))
explicitly assert the beacon GET fires on each locale page. Option
A would make those tests pass only on the production-deployed
edge, not on preview deployments — which is exactly when we want
them to fail loudly.

### One-time setup

1. **Add the site to CF Web Analytics**

   Dashboard route: <https://dash.cloudflare.com/?to=/:account/web-analytics>.
   The exact UI path varies as CF iterates the dashboard, but the
   landing page is reliably called _"Web Analytics"_ under the
   Analytics & Logs nav group.
   - Click _Add a site_.
   - Hostname: `jonathan-aerts.dev`.
   - Choose _Manual setup_ — automatic injection would conflict with
     our `worker/index.ts` HTMLRewriter pipeline (CF would inject the
     beacon after the nonce stamp and our CSP would block it).
   - CF shows a snippet of the form:

     ```html
     <script
       defer
       src="https://static.cloudflareinsights.com/beacon.min.js"
       data-cf-beacon='{"token": "<YOUR_32_CHAR_TOKEN_HERE>", "spa": false}'
     ></script>
     ```

     **Copy the 32-character `token` value** — that's what we need.
     The script src + structure is already wired in
     [`src/components/BaseHead.astro`](../src/components/BaseHead.astro).

2. **Token is hardcoded** as the default in
   [`src/components/BaseHead.astro`](../src/components/BaseHead.astro)
   (`DEFAULT_CF_WA_TOKEN`). Every build emits the beacon
   automatically — no env-var setup is needed for normal
   production deploys. The token is a public identifier (CF Web
   Analytics uses a non-secret site-scoped ID), same trust level
   as a GoatCounter site code.

   To **rotate**: replace `DEFAULT_CF_WA_TOKEN` in the source AND
   re-add the site in the CF dashboard (the old property
   continues collecting under the old token until you delete it).

   To **override per-environment** (e.g. a separate staging
   property): set `PUBLIC_CF_WA_TOKEN=<other>` at build time. Three
   ways:

   **Local builds**: prepend the variable on the command line.

   ```bash
   PUBLIC_CF_WA_TOKEN=abcdef… pnpm build
   ```

   **CF Workers Builds**: dashboard route → Worker `astro` →
   Settings → Variables and Secrets → Add variable, key
   `PUBLIC_CF_WA_TOKEN`, value `<token>`. No "Encrypt" toggle
   needed.

   **`.env` for repeated local builds**: create `.env` with
   `PUBLIC_CF_WA_TOKEN=…`. Astro picks it up via Vite's standard
   `.env` loader. Already in `.gitignore`.

   To **disable** the beacon (e.g. for an offline preview): set
   `PUBLIC_CF_WA_TOKEN=` (empty string) at build time. The snippet
   gracefully omits itself when the resolved token is empty.

### CSP allowance

Already wired in
[`worker/security-headers.ts`](../worker/security-headers.ts):

- `script-src` includes `https://static.cloudflareinsights.com` (the
  beacon CDN host).
- `connect-src` includes `https://cloudflareinsights.com` (the RUM
  ingest host — note the apex, not the `static.` subdomain).

If you ever rotate the beacon host (CF infrequently announces such
changes), update both directives. Synthetic monitor #12 will fail
within 5 min of the breakage.

### Verification after merge

1. Visit `https://jonathan-aerts.dev/` in a regular browser.
2. DevTools → Network tab → filter `cloudflareinsights`.
3. Expect: `GET https://static.cloudflareinsights.com/beacon.min.js`
   returns 200 + a JS body, followed shortly by `POST
https://cloudflareinsights.com/cdn-cgi/rum` returning 204 (or
   similar — CF doesn't formally document the success status code).
4. CF Dashboard → Web Analytics → wait 5–10 min → traffic stats
   appear.

If the beacon GET 200s but no POST follows, the CSP `connect-src`
allowance is missing. If the GET itself fails, the `script-src`
allowance is missing, or the token is wrong, or the CSP nonce
attribute didn't get stamped (HTMLRewriter race — very rare).

### Property identifiers (for external dashboards / API queries)

| Field               | Value                              | Where it's used                                                                                                                                                                                                      |
| ------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Site Token (beacon) | `f267155885aa4991a341b833c47a3c08` | Embedded in HTML as `data-cf-beacon`; what the browser POSTs to the RUM ingest.                                                                                                                                      |
| Site Tag            | `f880029bd2454d1b928a4e3b2f12416b` | CF API + Grafana datasource identifier for the property when querying RUM data programmatically. Not used in the runtime; kept here so future-us can wire dashboards without digging through the CF dashboard again. |

## Edge cache

We cache the three SSR routes (`/`, `/fr/`, `/ja/`) at the edge via
the Workers Cache API. The cached body is the bare HTML from
`dist/` — per-request CSP nonce is stamped on every read by
HTMLRewriter so CSP correctness is preserved across cache hits.

See [`worker/cache.ts`](../worker/cache.ts) for the module and
[`docs/cloudflare-gotchas.md`](./cloudflare-gotchas.md) §6 for the
SHA-salted key trick that ties cache invalidation to deploys.

The cache emits a `cache_status` event (third schema family — see
[`docs/analytics-queries.md`](./analytics-queries.md)) on every
cacheable request, so the hit ratio is queryable via SQL:

```sql
SELECT blob3 AS route, blob1 AS status, SUM(_sample_interval * double1) AS n
FROM astro_metrics
WHERE index1 = 'cache' AND timestamp >= NOW() - INTERVAL '1' HOUR
GROUP BY route, status
```

Expected hit ratio in steady state: **≥ 0.6** on `/` for an
authenticated human traffic mix (5-min TTL × ~1 req/min per visitor
session = ~5 cached reads per origin fetch). Bot traffic doesn't
move the ratio because it bypasses the cache entirely.

The `x-cache: HIT|MISS|BYPASS` response header lets you verify a
single request from the command line:

```bash
$ curl -sI https://jonathan-aerts.dev/ | grep -i x-cache
x-cache: HIT
```

## Cross-links

- [`docs/monitoring.md`](./monitoring.md) — 12 synthetic monitors +
  drift detection workflow
- [`docs/analytics-queries.md`](./analytics-queries.md) — SQL recipes
  for the Workers Analytics Engine dataset
- [`docs/cloudflare-gotchas.md`](./cloudflare-gotchas.md) — operational
  landmines from the Pages → Workers migration (binding
  pre-provisioning, branch slug rules, etc.)
- [`docs/security-headers.md`](./security-headers.md) — CSP strategy
  and the per-request nonce flow
