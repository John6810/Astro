# Workers Analytics Engine — SQL queries

The Worker emits one datapoint per request (CSP reports excluded) to
the `astro_metrics` dataset declared in `wrangler.jsonc`. Schema:

| Column                             | Source                                                    | Cardinality |
| ---------------------------------- | --------------------------------------------------------- | ----------- |
| `blob1` (alias `event_type`)       | `redirect_locale` / `direct_serve` / `bot_bypass` / `404` | 4           |
| `blob2` (alias `locale`)           | `en` / `fr` / `ja` / `unknown`                            | 4           |
| `blob3` (alias `user_agent_class`) | `human` / `bot_ai` / `bot_search` / `unknown`             | 4           |
| `double1` (alias `count`)          | always `1` — sum it to get request counts                 | 1           |
| `index1`                           | mirrors `blob1` for cheap partition pruning               | 4           |
| `timestamp`                        | auto-populated                                            | —           |

See `worker/analytics.ts` for the producer side, and Cloudflare's
[Analytics Engine SQL API docs](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/)
for how to run these from the dashboard, the API, or Grafana.

## Where to run

- **CF Dashboard**: Workers & Pages → `astro` Worker → Analytics →
  _Run SQL query_. Drop any of the queries below into the box.
- **HTTP API**: `POST https://api.cloudflare.com/client/v4/accounts/{account_id}/analytics_engine/sql`
  with the SQL string as the request body and an `Authorization: Bearer
<api-token>` header. The token needs `Account > Analytics > Read`.
- **Grafana**: install the Cloudflare datasource, point at the same SQL
  endpoint, build dashboards.

## Quota

10M datapoints / month on the free tier. At ~1 datapoint per request,
the threshold is ~3.85 req/sec sustained — well above realistic
portfolio traffic. If you ever cross 1M / month start sampling on the
producer side (e.g. `if (Math.random() < 0.1) recordRequest(…)`); the
SQL `count() * 10` reconstructs the original numbers.

## Queries

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
WHERE timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY user_agent_class
ORDER BY hits DESC
```

For "is the site getting picked up by LLM crawlers?", filter to AI
bots only:

```sql
SELECT
  toStartOfDay(timestamp) AS day,
  SUM(_sample_interval * double1) AS ai_bot_hits
FROM astro_metrics
WHERE
  blob3 = 'bot_ai'
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
WHERE timestamp >= NOW() - INTERVAL '7' DAY
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
WHERE timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY locale, user_agent_class
ORDER BY hits DESC
LIMIT 20
```

### Smoke check — datapoints landed in the last 5 min

Useful right after a deploy to confirm `env.ANALYTICS.writeDataPoint`
is actually firing:

```sql
SELECT
  blob1 AS event_type,
  blob2 AS locale,
  blob3 AS user_agent_class,
  COUNT() AS rows
FROM astro_metrics
WHERE timestamp >= NOW() - INTERVAL '5' MINUTE
GROUP BY event_type, locale, user_agent_class
```

If the result is empty for 5 min after a known-good traffic burst
(e.g. you just curled a few endpoints), check:

- `wrangler tail` for runtime errors from `recordRequest`
- The `ANALYTICS` binding exists in the Worker → Settings → Bindings
  (CF dashboard)
- `wrangler.jsonc` still declares the `analytics_engine_datasets`
  block (the deploy may have rewritten it if a previous build failed)

### Top non-redirected paths (404 + direct_serve buckets)

```sql
-- Path is NOT in the dataset (cardinality control — we only kept the
-- locale prefix). This query splits direct_serve by locale.
SELECT
  blob2 AS locale,
  blob1 AS event_type,
  SUM(_sample_interval * double1) AS hits
FROM astro_metrics
WHERE
  blob1 IN ('direct_serve', '404')
  AND timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY locale, event_type
ORDER BY hits DESC
```

If you need per-path granularity (e.g. _which_ 404s are firing), add a
`blob4` (or `blob5`) on the producer side — just be mindful of
cardinality. A handful of high-frequency 404 paths is fine; logging
every random scanner URL blows up the dataset for no insight.

## On `_sample_interval`

Analytics Engine downsamples high-cardinality datasets automatically.
Every row exposes `_sample_interval` (>= 1) which is the "weight" of
that sample. To get accurate counts, always multiply
`double1 * _sample_interval` before summing (or use the helper
function `SUM(_sample_interval * double1)`).

For our traffic volume the sampling factor will stay at 1 — but the
queries above use the safe form regardless so they keep working when
the dataset grows.
