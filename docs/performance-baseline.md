# Performance baseline

Captured during the polish PR (post-merge of PR #38). Use this file
as the reference for future regression detection — when a PR adds
weight to the bundle or slows the edge, compare against the numbers
below.

## Bundle size

Measured via `wrangler deploy --dry-run --outdir=.wrangler/<tag>` on
the merge commit of each PR, on a clean clone with `pnpm install`
and `astro build` first. The "raw" KiB is what the dashboard reports
as `Total Upload`; the "gzip" KiB is what the platform actually
serves between PoPs.

| PR            | Merge commit | Raw       | Gzip     | Delta vs prev            |
| ------------- | ------------ | --------- | -------- | ------------------------ |
| PR #37 (base) | `9fe5402`    | 11.88 KiB | 3.88 KiB | — (this is the baseline) |
| PR #38        | `441f385`    | 16.28 KiB | 4.97 KiB | +4.40 raw / +1.09 gzip   |

**Budget for PR #38 was ≤ +2 KiB raw**. Actual: **+4.40 KiB raw**,
**+1.09 KiB gzipped**.

The raw delta is dominated by:

| Source                                                                         | Approx. raw cost |
| ------------------------------------------------------------------------------ | ---------------- |
| `worker/cache.ts` — Workers Cache API wrapper + SHA salt logic                 | ~1.2 KiB         |
| `worker/index.ts` restructuring — cache branches + bot-bypass split + comments | ~1.5 KiB         |
| `worker/analytics.ts` — `recordCacheStatus` + `CacheStatusLabel` type          | ~0.5 KiB         |
| `worker/security-headers.ts` — extra CSP allowance comments + entries          | ~0.5 KiB         |
| Inline JSDoc and contract comments                                             | ~0.7 KiB         |

**Verdict**: the budget was tight relative to the feature scope.
Gzipped delta (+1.09 KiB) is the figure that matters for wire cost
and is well within Cloudflare's 1 MiB compressed Worker limit. The
raw-KiB budget is informational only; the polish PR keeps it
documented as a discrepancy rather than chasing it down by deleting
inline documentation.

## CPU time on `/` — PENDING LIVE MEASUREMENT

Cannot be measured from CI: `wrangler tail` requires a CF login
session. Measurement procedure documented below; numbers to be
filled in by the next operator who has dashboard access.

### Procedure

```bash
# 1. Force a fresh deploy so the cache is provably cold
git commit --allow-empty -m "chore: trigger redeploy for perf measurement"
git push origin main

# 2. Wait for CF Workers Builds to complete (~45 s; watch the
#    GitHub check-run on the commit). Tail the Worker:
pnpm wrangler:tail --format json > /tmp/wrangler-tail.jsonl &
TAIL_PID=$!

# 3. Cold run — 100 sequential GETs to /, no cache warming
for i in $(seq 1 100); do
  curl -s -o /dev/null -H "Accept-Language: en-US,en;q=0.9" \
    https://jonathan-aerts.dev/
done

# 4. Warm run — repeat immediately (cache is now warm from the
#    cold run's first MISS)
for i in $(seq 1 100); do
  curl -s -o /dev/null -H "Accept-Language: en-US,en;q=0.9" \
    https://jonathan-aerts.dev/
done

kill $TAIL_PID

# 5. Extract cpuTime values and compute percentiles
jq -r 'select(.event.request.url | endswith("/")) | .outcome.cpuTime' \
  /tmp/wrangler-tail.jsonl \
  | sort -n \
  | awk '
      { a[NR] = $1 }
      END {
        printf "count=%d p50=%.2fms p99=%.2fms\n", NR, a[int(NR*0.5)], a[int(NR*0.99)]
      }
    '
```

Run this once for the cold set, once for the warm set, then diff.

### Expected pattern

| Scenario                 | p50     | p99     |
| ------------------------ | ------- | ------- |
| Cold cache (post-deploy) | TODO ms | TODO ms |
| Warm cache (subsequent)  | TODO ms | TODO ms |
| Speedup (cold → warm)    | TODO %  | TODO %  |

**Sanity check**: warm p50 should be significantly lower than cold
p50 (SSR render is skipped on hits). If warm p50 is within 10% of
cold p50, the cache is either broken or its overhead (cache.match +
HTMLRewriter pass) cancels the gain. In that case, **DO NOT trust
the cache** and investigate before claiming a perf improvement.

The HTMLRewriter pass still runs on every request (cache hit or
miss) to stamp the per-request nonce — so the cache win is purely
the saved `env.ASSETS.fetch(request)` plus the body byte transfer
inside the Worker. Expected absolute gain: O(0.5 ms) p50, more on
p99 where asset fetch latency variance is larger.

## Architecture notes

- **SSR routes** (`/`, `/fr/`, `/ja/`): cached via
  [`worker/cache.ts`](../worker/cache.ts) with a SHA-salted cache
  key (`buildCacheKey`). The locale is encoded in the URL path (not
  a normalized lang param) because the redirect logic upstream has
  already collapsed Accept-Language variants into one of three
  paths.
- **TTL**: `s-maxage=300, max-age=0, must-revalidate` — CDN can
  cache 5 min, browser revalidates on every navigation.
- **Per-request nonce**: HTMLRewriter (in
  [`worker/security-headers.ts`](../worker/security-headers.ts)
  `rewriteHtmlWithNonce`) adds the `nonce` attribute on every
  `<script>`/`<style>` AFTER the cache layer returns its bytes.
  Cached body is bare HTML; rewrite is fresh per request.
- **Bots**: bypass cache entirely (`BYPASS` status). They're rare,
  low-volume, and pollute cache cardinality if we let them in.
- **302 redirects** (Accept-Language → `/fr/` etc.): not cached.
  Compute is trivial and caching would have to fragment by
  Accept-Language anyway.
- **Static assets** (CSS, JS, images, fonts, sitemap, robots.txt):
  unchanged — CF's default edge cache via `env.ASSETS.fetch()` is
  already optimal.
- **Cache invalidation**: the `_v=<sha7>` salt in the cache key
  forces every deploy to start with a cold cache. See
  [`docs/cloudflare-gotchas.md`](./cloudflare-gotchas.md) §6 for
  why Workers Cache API entries otherwise outlive deploys.

## Coverage (Istanbul, captured during polish PR)

`pnpm test --coverage` against the post-PR-38 main snapshot:

| File                          | % Stmts | % Branch | % Funcs | % Lines |
| ----------------------------- | ------- | -------- | ------- | ------- |
| `worker/analytics.ts`         | 97.37   | 96.43    | 100     | 100     |
| `worker/cache.ts`             | 96.67   | 66.67    | 100     | 100     |
| `worker/csp-report.ts`        | 91.11   | 87.50    | 100     | 90.9    |
| `worker/index.ts`             | 97.40   | 91.84    | 100     | 100     |
| `worker/security-headers.ts`  | 100     | 100      | 100     | 100     |
| `worker/version.ts`           | 100     | 100      | 100     | 100     |
| `worker/version.generated.ts` | 100     | 100      | 100     | 100     |

Target: ≥ 90% statements / lines per file. **All files meet the
target**. The lowest is `csp-report.ts` at 90.9% lines (lines
43-44, 78, 104 uncovered — the throttle-reset-after-window-elapsed
branch and a few defensive guards that don't fire in practice).

The `cache.ts` 66.67% branch number is the integer math of a small
branch count, not a real coverage hole — the file has ~6 total
branches, 4 covered. The uncovered ones are the
`if (content-length)` and `if (cl)` guards inside `makeCacheable`
which are skipped because the test response objects don't set those
headers. Worth a follow-up test if cache.ts ever grows; not a
blocker today.

## How to re-measure

The full procedure is bundled here so the next reviewer can
reproduce on their box:

### Bundle delta

```bash
# Current main
git checkout main
pnpm install --frozen-lockfile
pnpm build
pnpm exec wrangler deploy --dry-run --outdir=.wrangler/current
# Note the "Total Upload" line

# Previous baseline
git checkout <previous-merge-commit>
pnpm install --frozen-lockfile
pnpm build
pnpm exec wrangler deploy --dry-run --outdir=.wrangler/baseline
# Note again, diff manually

git checkout main
```

### Coverage

```bash
pnpm install --frozen-lockfile
pnpm test --coverage
# Per-file in: coverage/coverage-final.json
# Per-file in: coverage/lcov-report/<file>.ts.html
```

The text reporter is terse — see `coverage/index.html` (open in a
browser) for the full annotated HTML.

### CPU time

See the **CPU time on `/`** section above.
