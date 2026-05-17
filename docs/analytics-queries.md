# Workers Analytics Engine — SQL queries

The Worker emits one datapoint per **HTML** request (static assets,
favicons, sitemap, etc. are deliberately not counted — see
[`worker/index.ts`](../worker/index.ts) `isHtmlContentType`) plus one
datapoint per CSP violation report ingested at `/csp-report`. All
datapoints land in the `astro_metrics` dataset declared in
`wrangler.jsonc`.

## On `_sample_interval` — read this first

Analytics Engine returns sample-weighted rows. Every row exposes a
`_sample_interval` column (always ≥ 1) which is the "weight" of that
sample. At low volume (anything below ~thousands of req/s), AE never
downsamples and `_sample_interval` is always 1 — so `COUNT()` and
`SUM(_sample_interval * double1)` return identical results.

As volume grows, AE auto-samples the dataset and starts returning
fewer rows with `_sample_interval > 1`. At that point a naïve
`COUNT()` undercounts by the sampling factor. The fix is to **always
write `SUM(_sample_interval * double1)`** in any query that returns
event counts — it stays accurate across volume regimes.

For our traffic the sampling factor will stay at 1, but the queries
below all use the safe form so they keep working when the dataset
grows.

## Schema reference

The dataset has a **fixed column layout** with **overloaded semantics
per event type**. Querier must discriminate via `blob1` (also
mirrored to `index1` for partition pruning) before interpreting
`blob2`/`blob3`.

| Column                    | Always                                                     | Cardinality |
| ------------------------- | ---------------------------------------------------------- | ----------- |
| `blob1`                   | event-discriminator (varies — see below)                   | 6           |
| `double1` (alias `count`) | always `1` — multiply by `_sample_interval` before summing | 1           |
| `index1`                  | partition tag (varies — see below)                         | 6           |
| `timestamp`               | auto-populated                                             | —           |
| `_sample_interval`        | weight for sampled rows (see above)                        | —           |

Per-event semantics for `blob1` / `blob2` / `blob3` / `index1`:

| Event family   | `blob1`                                                   | `blob2`                                   | `blob3`                                                                               | `index1`        |
| -------------- | --------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- | --------------- |
| Request events | `redirect_locale` / `direct_serve` / `bot_bypass` / `404` | `locale` (`en` / `fr` / `ja` / `unknown`) | `user_agent_class` (`human` / `bot_ai` / `bot_search` / `unknown`)                    | mirrors `blob1` |
| CSP violations | `csp_violation`                                           | `directive` (e.g. `script-src`)           | `blocked_domain` (bare hostname, or scheme like `data:` / `inline`, or `unparseable`) | `csp_violation` |
| Cache outcomes | `cache_status` value (`hit` / `miss` / `bypass`)          | `locale` (`en` / `fr` / `ja`)             | `route` (`/` / `/fr/` / `/ja/`)                                                       | `cache`         |

The cache family is the **third schema variant** and the one place
where `index1` is a category tag rather than a mirror of `blob1`. The
trade-off: a single `WHERE index1 = 'cache'` partition prune pulls
all cache rows regardless of outcome, which makes hit-ratio queries
cheaper than splitting on `blob1`.

**Producer side**: see [`worker/analytics.ts`](../worker/analytics.ts)
(`recordRequest`, `recordCspViolation`, `recordCacheStatus`). All
three functions write to the same dataset; the schema overload is
the trade-off for keeping the binding count at one.

For how to run these queries (CF Dashboard, HTTP API, or Grafana),
see Cloudflare's
[Analytics Engine SQL API docs](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/).

## Where to run

- **CF Dashboard**: Workers & Pages → `astro` Worker → Analytics →
  _Run SQL query_. Drop any of the queries below into the box.
- **HTTP API**: `POST https://api.cloudflare.com/client/v4/accounts/{account_id}/analytics_engine/sql`
  with the SQL string as the request body and an `Authorization: Bearer
<api-token>` header. The token needs `Account > Analytics > Read`.
- **Grafana**: install the Cloudflare datasource, point at the same SQL
  endpoint, build dashboards.

## Quota

10M datapoints / month on the free tier. With the HTML-only filter
in place we emit roughly one datapoint per page view (not per HTTP
request, which means images, fonts, CSS, JS, sitemap, robots don't
count) plus one per CSP violation. At ~1 datapoint per page view the
threshold is ~3.85 page views/sec sustained — well above realistic
portfolio traffic. If you ever cross 1M / month start sampling on
the producer side (e.g. `if (Math.random() < 0.1) recordRequest(…)`);
the SQL `SUM(_sample_interval * double1) * 10` reconstructs the
original numbers.

## Queries — request events

### Redirect ratio per locale, last 7 days

```sql
SELECT
  blob2 AS locale,
  SUM(_sample_interval * double1) AS redirects
FROM astro_metrics
WHERE
  blob1 = 'redirect_locale'
  AND timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY locale
ORDER BY redirects DESC
```

Compare with `blob1 = 'direct_serve'` (visitors that landed on `/`
in EN directly) to compute the "what fraction of visitors prefer
non-English" ratio over the same window:

```sql
SELECT
  blob1 AS event_type,
  SUM(_sample_interval * double1) AS hits
FROM astro_metrics
WHERE
  blob1 IN ('redirect_locale', 'direct_serve')
  AND timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY event_type
```

### Bot vs human ratio, last 30 days

```sql
SELECT
  blob3 AS user_agent_class,
  SUM(_sample_interval * double1) AS hits
FROM astro_metrics
WHERE
  blob1 IN ('redirect_locale', 'direct_serve', 'bot_bypass', '404')
  AND timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY user_agent_class
ORDER BY hits DESC
```

Note the explicit `blob1 IN (…)` — without it the query would also
count `csp_violation` rows whose `blob3` is a `blocked_domain`
string, which is meaningless for the bot/human question. Always
scope a `blob3`-aggregation query to the relevant `event_type` set.

For "is the site getting picked up by LLM crawlers?", filter to AI
bots only:

```sql
SELECT
  toStartOfDay(timestamp) AS day,
  SUM(_sample_interval * double1) AS ai_bot_hits
FROM astro_metrics
WHERE
  blob1 IN ('redirect_locale', 'direct_serve', 'bot_bypass', '404')
  AND blob3 = 'bot_ai'
  AND timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY day
ORDER BY day
```

### 404 rate per day, last 14 days

```sql
SELECT
  toStartOfDay(timestamp) AS day,
  SUM(_sample_interval * double1) AS hits_404
FROM astro_metrics
WHERE
  blob1 = '404'
  AND timestamp >= NOW() - INTERVAL '14' DAY
GROUP BY day
ORDER BY day
```

If a spike correlates with a deploy, the most likely cause is a
removed page that something still links to. Cross-check with the
sitemap diff.

### Daily breakdown — direct serves vs redirects vs bot bypasses

```sql
SELECT
  toStartOfDay(timestamp) AS day,
  blob1 AS event_type,
  SUM(_sample_interval * double1) AS hits
FROM astro_metrics
WHERE
  blob1 IN ('redirect_locale', 'direct_serve', 'bot_bypass')
  AND timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY day, event_type
ORDER BY day, event_type
```

### Top locale + UA class combinations

```sql
SELECT
  blob2 AS locale,
  blob3 AS user_agent_class,
  SUM(_sample_interval * double1) AS hits
FROM astro_metrics
WHERE
  blob1 IN ('redirect_locale', 'direct_serve', 'bot_bypass', '404')
  AND timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY locale, user_agent_class
ORDER BY hits DESC
LIMIT 20
```

## Queries — CSP violation events

Each row in this section has the **overloaded** blob layout:
`blob2 = directive`, `blob3 = blocked_domain`. Don't mix these
queries with the request-event queries above without an explicit
`blob1` filter.

### Violations per directive, last 7 days

```sql
SELECT
  blob2 AS directive,
  SUM(_sample_interval * double1) AS violations
FROM astro_metrics
WHERE
  blob1 = 'csp_violation'
  AND timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY directive
ORDER BY violations DESC
```

Expected dominant rows: `script-src` (the strictest directive,
catches most third-party drift), then `style-src`, then `img-src`.
A spike in `script-src` after a deploy means a new bundle started
loading a script the CSP doesn't allow — fix by either whitelisting
the source or removing the script.

### Top blocked domains, last 30 days

```sql
SELECT
  blob3 AS blocked_domain,
  blob2 AS directive,
  SUM(_sample_interval * double1) AS violations
FROM astro_metrics
WHERE
  blob1 = 'csp_violation'
  AND timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY blocked_domain, directive
ORDER BY violations DESC
LIMIT 50
```

Useful for the "is something on the page trying to phone home?"
question. Bucket interpretation:

- bare hostname (e.g. `googletagmanager.com`) → real third-party
  request we didn't whitelist
- `inline` / `eval` → unsafe inline script someone forgot to nonce
- `data:` / `blob:` → opaque data-URI usage (usually fine but
  flag-worthy if the directive wasn't expected)
- `unparseable` → malformed report bodies (probably worth a one-off
  manual log inspection if it's not zero)

### Synthetic monitor #10 health check, last 1 day

The Better Stack `csp-report-ingest` monitor (see
[`docs/monitoring.md`](./monitoring.md)) POSTs a synthetic violation
every 5 min from 5 regions. We should see ~288 rows / day at steady
state — anything significantly below that means the ingest pipeline
itself is broken.

```sql
SELECT COUNT() AS synthetic_hits
FROM astro_metrics
WHERE
  blob1 = 'csp_violation'
  AND blob3 = 'example.com'
  AND timestamp >= NOW() - INTERVAL '1' DAY
```

(`COUNT()` is intentional here — we want the raw row count, not the
weighted sum, to compare against the deterministic monitor cadence.)

### CSP violations per day, last 14 days

```sql
SELECT
  toStartOfDay(timestamp) AS day,
  SUM(_sample_interval * double1) AS violations
FROM astro_metrics
WHERE
  blob1 = 'csp_violation'
  AND timestamp >= NOW() - INTERVAL '14' DAY
GROUP BY day
ORDER BY day
```

## Queries — cache outcomes

Rows in this section all share `index1 = 'cache'`. `blob1` carries
the cache outcome (`hit` / `miss` / `bypass`), `blob2` the locale,
`blob3` the route. Don't expect `blob1` to be a stable event_type
here — that convention only applies to the request and CSP
families.

### Cache hit ratio per route, last 7 days

```sql
SELECT
  blob3 AS route,
  blob1 AS cache_status,
  SUM(_sample_interval * double1) AS hits
FROM astro_metrics
WHERE
  index1 = 'cache'
  AND timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY route, cache_status
ORDER BY route, hits DESC
```

Reading the result: for each route, the rows in `cache_status` order
give the absolute count of HIT / MISS / BYPASS responses. Hit ratio
is `hit / (hit + miss)`; bypass count is independent (bots).

### Daily cache hit ratio on /, last 14 days

```sql
SELECT
  toStartOfDay(timestamp) AS day,
  SUM(_sample_interval * double1 * CASE WHEN blob1 = 'hit' THEN 1 ELSE 0 END) AS hits,
  SUM(_sample_interval * double1 * CASE WHEN blob1 = 'miss' THEN 1 ELSE 0 END) AS misses
FROM astro_metrics
WHERE
  index1 = 'cache'
  AND blob3 = '/'
  AND blob1 IN ('hit', 'miss')
  AND timestamp >= NOW() - INTERVAL '14' DAY
GROUP BY day
ORDER BY day
```

If the hit ratio drops sharply after a deploy: the COMMIT_SHA-based
cache salt rotated the namespace as intended, and the first ~5 min
of post-deploy traffic legitimately misses while the colo warms up.
Drops that persist beyond ~10 min suggest the cache TTL is
mismatched (or — worst case — the worker is rejecting its own
writes somehow).

### Bot bypass rate, last 30 days

```sql
SELECT
  blob3 AS route,
  SUM(_sample_interval * double1) AS bypasses
FROM astro_metrics
WHERE
  index1 = 'cache'
  AND blob1 = 'bypass'
  AND timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY route
ORDER BY bypasses DESC
```

Useful for the "how much of `/` traffic is bot scrapes?" question —
the bypass row is exactly that.

## Smoke check — datapoints landed in the last 5 min

Useful right after a deploy to confirm `env.ANALYTICS.writeDataPoint`
is firing for both event categories:

```sql
SELECT
  blob1 AS event_type,
  blob2 AS dim2,
  blob3 AS dim3,
  COUNT() AS rows
FROM astro_metrics
WHERE timestamp >= NOW() - INTERVAL '5' MINUTE
GROUP BY event_type, dim2, dim3
```

(`COUNT()` for the smoke check rather than `SUM(_sample_interval *
double1)` because we want to confirm rows are _landing_, not their
aggregated business meaning.)

If the result is empty for 5 min after a known-good traffic burst
(e.g. you just curled a few endpoints and POSTed a CSP report):

- `wrangler tail` for runtime errors from `recordRequest` or
  `recordCspViolation`
- The `ANALYTICS` binding exists in the Worker → Settings → Bindings
  (CF dashboard) — see
  [`docs/cloudflare-gotchas.md`](./cloudflare-gotchas.md) for the
  pre-provisioning gotcha that caused PR #35's silent build failure
- `wrangler.jsonc` still declares the `analytics_engine_datasets`
  block (the deploy may have rewritten it if a previous build failed)
