# External synthetic monitoring

Cloudflare Workers Logs and the Analytics Engine (see
[`docs/analytics-queries.md`](./analytics-queries.md)) cover the
**internal** view — what the Worker saw, what it logged. Neither tells
us _"is the live site doing what the spec promised, from outside the
edge?"_ Synthetic monitoring closes that gap.

## Vendor: Better Stack (formerly Better Uptime)

| Need                              | Why Better Stack wins                                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Free tier sufficient for 8 checks | 10 monitors at 3-min interval are free. We are configuring 8.                                                                 |
| Multi-region                      | Free plan checks from 5 regions (US-East, US-West, EU, Asia, Australia). Each region must agree on a failure before alerting. |
| HTTP body + header assertions     | Native `Response should contain` and `Response header` rules, no scripting needed.                                            |
| Custom request headers            | We need `Accept-Language` and `User-Agent` overrides per check — Better Stack supports both.                                  |
| Webhook + email + Slack/Discord   | All free.                                                                                                                     |

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

## The 8 monitors

For each row below, in the Better Stack dashboard:

1. _Create monitor_ → _HTTP / website monitoring_
2. Fill **Name**, **URL**, **HTTP method**, **Request headers**, **Status
   code**, **Body/header assertions**.
3. **Check frequency**: every 3 min (the closest free-tier slot to the
   spec's 5 min). **Multi-region**: enabled.
4. **Alerting**:
   - Open incident after **2 consecutive failures**
   - Recover after **1 success**
   - Severity: high

| #   | Name                | URL                                               | Method | Request headers                            | Expect status | Body / header assertion                                                                                                    |
| --- | ------------------- | ------------------------------------------------- | ------ | ------------------------------------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | `loc-redirect-fr`   | `https://jonathan-aerts.dev/`                     | `GET`  | `Accept-Language: fr-BE,fr;q=0.9,en;q=0.5` | `302`         | Header `Location` equals `https://jonathan-aerts.dev/fr/`                                                                  |
| 2   | `loc-redirect-ja`   | `https://jonathan-aerts.dev/`                     | `GET`  | `Accept-Language: ja-JP,ja;q=0.9`          | `302`         | Header `Location` equals `https://jonathan-aerts.dev/ja/`                                                                  |
| 3   | `loc-en-direct`     | `https://jonathan-aerts.dev/`                     | `GET`  | `Accept-Language: en-US,en;q=0.9`          | `200`         | Body contains `lang="en"`                                                                                                  |
| 4   | `bot-bypass-claude` | `https://jonathan-aerts.dev/`                     | `GET`  | `User-Agent: ClaudeBot/1.0`                | `200`         | Header `Location` **absent**                                                                                               |
| 5   | `locale-fr-page`    | `https://jonathan-aerts.dev/fr/`                  | `GET`  | _(none)_                                   | `200`         | Body contains `lang="fr"` AND header `Vary` absent                                                                         |
| 6   | `locale-ja-page`    | `https://jonathan-aerts.dev/ja/`                  | `GET`  | _(none)_                                   | `200`         | Body contains `lang="ja"`                                                                                                  |
| 7   | `sitemap-coverage`  | `https://jonathan-aerts.dev/sitemap-index.xml`    | `GET`  | _(none)_                                   | `200`         | Body contains all three: `https://jonathan-aerts.dev/`, `https://jonathan-aerts.dev/fr/`, `https://jonathan-aerts.dev/ja/` |
| 8   | `404-handling`      | `https://jonathan-aerts.dev/nonexistent-path-zzz` | `GET`  | _(none)_                                   | `404`         | Body contains `Page not found`                                                                                             |

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

## How to deliberately regress (and validate the alerts fire)

To prove the alerts actually work, push a regression that should trip
exactly one check, wait ≤ 10 min, see the alert hit your channel,
then revert.

Examples that each break one check cleanly:

| Check               | Cheap regression                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| `loc-redirect-fr`   | Remove `"fr"` from `SUPPORTED` in `worker/index.ts` — every fr-BE visitor stops getting redirected. |
| `bot-bypass-claude` | Drop `ClaudeBot` from `BOT_UA` regex — bots now get 302'd to /fr/ etc.                              |
| `locale-fr-page`    | Rename `<html lang="fr">` to `<html lang="francais">` in `RecruiterLayout.astro`.                   |
| `sitemap-coverage`  | Remove a locale from `i18n.locales` in `astro.config.mjs`.                                          |
| `404-handling`      | Delete `src/pages/404.astro`.                                                                       |

Each regression should:

1. Trigger 2 consecutive failures within 3 × 2 = 6 min.
2. Open an incident.
3. Fan out to the alert channel within seconds of the second failure.

Then revert, watch the recovery hit on the next check.

## Cost

Free tier as configured (8 monitors @ 3-min interval, 5 regions, email
alerts). Bump to a paid plan only if you want sub-minute frequency or
SMS escalation — neither is justified for a portfolio.

## Maintenance

- The acceptance criteria checked here are a strict subset of the
  ones in `worker/__tests__/` and `tests/e2e/`. If a new AC lands,
  add it to those internal tests **and** add a corresponding monitor
  here if the AC is observable externally (i.e. via HTTP from outside
  the edge).
- Don't add `User-Agent`-targeting checks that would land us in the
  bot bypass branch unless that's the intent (check #4 is the only
  one that does).
