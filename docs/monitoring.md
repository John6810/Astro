# External synthetic monitoring

Cloudflare Workers Logs and the Analytics Engine (see
[`docs/analytics-queries.md`](./analytics-queries.md)) cover the
**internal** view — what the Worker saw, what it logged. Neither tells
us _"is the live site doing what the spec promised, from outside the
edge?"_ Synthetic monitoring closes that gap, and the GH Action
described in the **Drift detection** section below closes the related
gap of _"is the live edge running the commit we last merged?"_.

## Vendor: Better Stack (formerly Better Uptime)

| Need                               | Why Better Stack wins                                                                                                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free tier sufficient for 11 checks | 10 monitors at 3-min interval are free; we run 11 by dropping monitors #9 and #10 to a 5-min cadence (they cover the slower-changing security observability surface, so the lower frequency is fine). |
| Multi-region                       | Free plan checks from 5 regions (US-East, US-West, EU, Asia, Australia). Each region must agree on a failure before alerting.                                                                         |
| HTTP body + header assertions      | Native `Response should contain` and `Response header` rules, no scripting needed.                                                                                                                    |
| Custom request headers + POST body | We need `Accept-Language` and `User-Agent` overrides per check, plus a POST body for monitor #10 — Better Stack supports both.                                                                        |
| Webhook + email + Slack/Discord    | All free.                                                                                                                                                                                             |

Honourable mentions: Checkly has a nicer DSL with Playwright synthetics
but its free tier is tighter (10K runs/mo total). Uptime Kuma is great
self-hosted but requires us to maintain another service for the sole
purpose of monitoring this one.

## One-time setup (≈10 min)

1. **Sign up** at <https://betterstack.com/uptime/>. Use the recruiter
   email — the dashboard surfaces incident timelines that look good
   on a portfolio.
2. **Notification policy** → _Add Slack/Discord/Email/Webhook_. Pick one
   primary, leave the others empty for now. The placeholder webhook
   below works for any HTTP receiver if you want a generic plug.
3. **Status pages** → optional, but recommended: create a public status
   page at `status.jonathan-aerts.dev` (free, custom domain) and link
   it from the recruiter footer.

## The 11 monitors

Monitors #1–#8 cover **functional** ACs (locale routing, bot bypass,
sitemap, 404). Monitors #9–#10 cover the **security observability**
layer (CSP header content + the `/csp-report` ingest itself) — they
page at a higher severity because losing visibility into security
regressions is strictly worse than a functional regression. Monitor
#11 is the safety net for the `/version` drift-detection endpoint.

For each row below, in the Better Stack dashboard:

1. _Create monitor_ → _HTTP / website monitoring_
2. Fill **Name**, **URL**, **HTTP method**, **Request headers**, **Status
   code**, **Body/header assertions**.
3. **Check frequency**: every 3 min (the closest free-tier slot to the
   spec's 5 min) for #1–#8 and #11; every 5 min for #9 and #10 to
   stay inside the 10-monitor free tier. **Multi-region**: enabled.
4. **Alerting**:
   - Open incident after **2 consecutive failures**
   - Recover after **1 success**
   - Severity: **high** for #1–#8 and #11, **paging** for #9 and #10
     (security observability)

| #   | Name                | URL                                               | Method | Request headers                            | Expect status | Body / header assertion                                                                                                       |
| --- | ------------------- | ------------------------------------------------- | ------ | ------------------------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | `loc-redirect-fr`   | `https://jonathan-aerts.dev/`                     | `GET`  | `Accept-Language: fr-BE,fr;q=0.9,en;q=0.5` | `302`         | Header `Location` equals `https://jonathan-aerts.dev/fr/`                                                                     |
| 2   | `loc-redirect-ja`   | `https://jonathan-aerts.dev/`                     | `GET`  | `Accept-Language: ja-JP,ja;q=0.9`          | `302`         | Header `Location` equals `https://jonathan-aerts.dev/ja/`                                                                     |
| 3   | `loc-en-direct`     | `https://jonathan-aerts.dev/`                     | `GET`  | `Accept-Language: en-US,en;q=0.9`          | `200`         | Body contains `lang="en"`                                                                                                     |
| 4   | `bot-bypass-claude` | `https://jonathan-aerts.dev/`                     | `GET`  | `User-Agent: ClaudeBot/1.0`                | `200`         | Header `Location` **absent**                                                                                                  |
| 5   | `locale-fr-page`    | `https://jonathan-aerts.dev/fr/`                  | `GET`  | _(none)_                                   | `200`         | Body contains `lang="fr"` AND header `Vary` absent                                                                            |
| 6   | `locale-ja-page`    | `https://jonathan-aerts.dev/ja/`                  | `GET`  | _(none)_                                   | `200`         | Body contains `lang="ja"`                                                                                                     |
| 7   | `sitemap-coverage`  | `https://jonathan-aerts.dev/sitemap-index.xml`    | `GET`  | _(none)_                                   | `200`         | Body contains all three: `https://jonathan-aerts.dev/`, `https://jonathan-aerts.dev/fr/`, `https://jonathan-aerts.dev/ja/`    |
| 8   | `404-handling`      | `https://jonathan-aerts.dev/nonexistent-path-zzz` | `GET`  | _(none)_                                   | `404`         | Body contains `Page not found`                                                                                                |
| 9   | `csp-header-shape`  | `https://jonathan-aerts.dev/`                     | `GET`  | _(none)_                                   | `200`         | Header `Content-Security-Policy` contains ALL of: `nonce-`, `'strict-dynamic'`, `object-src 'none'`, `report-to csp-endpoint` |
| 10  | `csp-report-ingest` | `https://jonathan-aerts.dev/csp-report`           | `POST` | `Content-Type: application/csp-report`     | `204`         | _(no body assertion — 204 has no body; see POST body below)_                                                                  |
| 11  | `version-endpoint`  | `https://jonathan-aerts.dev/version`              | `GET`  | _(none)_                                   | `200`         | Response is JSON with non-empty `.sha` (40 hex chars OR `"dev"`) and ISO-8601 `.builtAt`                                      |

### Per-monitor configuration notes

**Monitor #9 — CSP header content** (severity: paging, every 5 min)
The four substrings together prove the strict-CSP rollout from
PR #34 is still live. Loss of `'strict-dynamic'` would silently
degrade to a wildcard-friendly `script-src 'self' …` policy (less
strict); loss of `report-to` would silently disable violation
reporting; loss of `object-src 'none'` would re-open the `<object>`
sink. None of these surfaces as a functional regression in a normal
browser session, so an explicit external check is the only reliable
guard.

**Monitor #10 — CSP report ingest** (severity: paging, every 5 min)
POST body (the synthetic violation):

```json
{
  "csp-report": {
    "document-uri": "https://jonathan-aerts.dev/",
    "violated-directive": "script-src",
    "blocked-uri": "https://example.com/synthetic-monitor-probe.js",
    "disposition": "enforce"
  }
}
```

This synthetic probe also generates a real `csp_violation` event in
the Analytics Engine dataset every 5 min, so a daily query is enough
to verify the ingest pipeline end-to-end without a live receiver:

```sql
-- Should return ≥ 200 rows / day (288 expected at 5-min cadence × 5 regions)
SELECT COUNT() FROM astro_metrics
WHERE blob1 = 'csp_violation'
  AND blob3 = 'example.com'
  AND timestamp >= NOW() - INTERVAL '1' DAY
```

Document-only — no need to wire this as a Better Stack alert; the
5-min synthetic frequency means a real ingest outage is caught by
monitor #10 itself within 10 min.

**Monitor #11 — Version endpoint** (severity: warning, every 3 min)
The safety net for `.github/workflows/drift-check.yml`. If the GH
Action's polling logic itself breaks (transient GH API outage, an
edit that introduces a workflow syntax error), at least Better
Stack still tells us that `/version` is reachable and returning a
parseable response. The body assertion is loose — a `.sha` that
matches the regex `^[a-f0-9]{40}$|^dev$` — because the drift
workflow handles the comparison logic.

### Tip: bulk import

Better Stack supports CSV import of monitors. The repo contains a
machine-readable copy of the table above so you can paste it without
hand-typing — see `docs/monitoring-checks.csv`. (If that file isn't
present yet, copy from this table.)

## Alert channel

Better Stack → Settings → Integrations → pick one of:

- **Email** — quickest. Set to the recruiter inbox.
- **Slack** — paste an incoming-webhook URL.
- **Discord** — same shape.
- **Generic webhook** — POST to a placeholder receiver. There's no live
  webhook configured today; once you have one, drop the URL here:

  ```
  https://example.com/webhook/placeholder
  ```

  Update this URL when the real receiver lands.

The same notification policy fans out to whichever channels you've
enabled. Two consecutive failures opens an incident; one success
closes it.

## Drift detection (`.github/workflows/drift-check.yml`)

External monitoring tells you _"is the live site doing what the spec
promised"_; the drift-check workflow tells you _"is the live site
running the commit we last merged"_. Different question, same goal —
catch a silent CF Workers Build failure before a recruiter notices.

### Mechanism

1. The Worker exposes `GET /version` returning `{ sha, builtAt,
worker: "astro" }`. The SHA is injected at build time by
   `scripts/generate-version.mjs` (reads `WORKERS_CI_COMMIT_SHA` /
   `CF_PAGES_COMMIT_SHA` / `GITHUB_SHA` / `git rev-parse HEAD`,
   falling back to `"dev"`).
2. The workflow runs on every push to `main` (immediate check after
   merge) AND every 10 min via cron (catches rollbacks / late failures).
3. For each run: fetch `main` HEAD SHA from the GitHub API, fetch
   the deployed SHA from `https://jonathan-aerts.dev/version`,
   compare. Mismatch → fail the job and post a comment on the latest
   merged PR.
4. **Tolerance window**: a commit younger than 10 min is treated as
   "build likely still running" and tolerated. CF Workers Builds
   typically completes in 45–60s; the 10-min ceiling gives even a
   pathological 5× slower build room to land before we flag drift.
5. **Transient failures**: a non-responsive `/version` (network error,
   504, etc.) is retried 3× with 5s backoff. After three failures the
   workflow exits 0 (treating the gap as ambient noise) and lets
   monitor #11 alert on prolonged endpoint outages.

### Alert channels

The workflow surfaces drift via:

- **GitHub Actions failure** — visible on the repo's Actions tab and
  via the GitHub mobile app push notification.
- **PR comment** — auto-posted on the latest merged PR when there's a
  match between its merge commit and main HEAD.
- **(Optional) Webhook** — the workflow doesn't post to an external
  webhook by default. To wire one up, add a step at the end of the
  drift-failure branch that POSTs to your endpoint. The same
  placeholder URL above (`https://example.com/webhook/placeholder`)
  is the right placeholder to replace.

### Why both this AND the Better Stack monitor?

Defense in depth. If the GH Action itself breaks (workflow YAML
error, repository rate limit, GitHub API outage), Better Stack
monitor #11 still pings `/version` every 3 min and pages on a
non-200 / malformed JSON. If Better Stack itself goes down, the
drift-check workflow still runs from GitHub-hosted runners. The
two signals overlap so neither can be the single point of failure.

## How to deliberately regress (and validate the alerts fire)

To prove the alerts actually work, push a regression that should trip
exactly one check, wait ≤ 10 min, see the alert hit your channel,
then revert.

Examples that each break one check cleanly:

| Check               | Cheap regression                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `loc-redirect-fr`   | Remove `"fr"` from `SUPPORTED` in `worker/index.ts` — every fr-BE visitor stops getting redirected.     |
| `bot-bypass-claude` | Drop `ClaudeBot` from `BOT_UA` regex — bots now get 302'd to /fr/ etc.                                  |
| `locale-fr-page`    | Rename `<html lang="fr">` to `<html lang="francais">` in `RecruiterLayout.astro`.                       |
| `sitemap-coverage`  | Remove a locale from `i18n.locales` in `astro.config.mjs`.                                              |
| `404-handling`      | Delete `src/pages/404.astro`.                                                                           |
| `csp-header-shape`  | Drop `'strict-dynamic'` from the CSP `script-src` list in `worker/security-headers.ts`.                 |
| `csp-report-ingest` | Change `isCspReportRequest` in `worker/csp-report.ts` to require `GET` — POSTs now fall through to 404. |
| `version-endpoint`  | Comment out the `isVersionRequest` branch in `worker/index.ts` — `/version` now redirects to `/fr/`.    |

Each regression should:

1. Trigger 2 consecutive failures within `frequency × 2` min (6 min for
   3-min monitors, 10 min for 5-min monitors).
2. Open an incident.
3. Fan out to the alert channel within seconds of the second failure.

Then revert, watch the recovery hit on the next check.

## Cost

Free tier as configured (10 monitors @ 3-min, 1 monitor @ 5-min, 5
regions, email alerts). The 11th monitor stays inside the free quota
because the 5-min cadence on #9 and #10 means we average one monitor
slot under the limit. Bump to a paid plan only if you want sub-minute
frequency or SMS escalation — neither is justified for a portfolio.

## Maintenance

- The acceptance criteria checked here are a strict subset of the
  ones in `worker/__tests__/` and `tests/e2e/`. If a new AC lands,
  add it to those internal tests **and** add a corresponding monitor
  here if the AC is observable externally (i.e. via HTTP from outside
  the edge).
- Don't add `User-Agent`-targeting checks that would land us in the
  bot bypass branch unless that's the intent (check #4 is the only
  one that does).
- If you add a new CF resource binding (D1, KV, R2, Queues, Vectorize,
  Hyperdrive), pre-provision it in the CF dashboard BEFORE merging the
  `wrangler.jsonc` change — see
  [`docs/cloudflare-gotchas.md`](./cloudflare-gotchas.md). The drift
  check above will fire if you forget.
