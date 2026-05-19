# Cloudflare gotchas

Operational landmines hit during the migration from CF Pages →
CF Workers + Static Assets. Documented here so future-us (or
future-you, reader) doesn't lose another afternoon to the same
debugging.

## 1. Bindings require pre-provisioning on the account

Every CF resource binding declared in `wrangler.jsonc` requires the
underlying resource to **already exist on the account** before the
deploy is attempted. The binding does NOT auto-provision the
resource — it is purely a reference.

| Binding type                  | Resource to create first               | How                                                                                                                                  |
| ----------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `analytics_engine_datasets`   | Dataset (and the AE product opt-in)    | Dashboard → Workers → Analytics Engine → _Create Dataset_. The first dataset creation also activates the AE product for the account. |
| `d1_databases`                | D1 database                            | `wrangler d1 create <name>` or Dashboard → Storage → D1                                                                              |
| `kv_namespaces`               | KV namespace                           | `wrangler kv namespace create <name>` or Dashboard → Storage → KV                                                                    |
| `r2_buckets`                  | R2 bucket                              | `wrangler r2 bucket create <name>` or Dashboard → R2                                                                                 |
| `queues`                      | Queue                                  | `wrangler queues create <name>` or Dashboard → Queues                                                                                |
| `vectorize`                   | Vectorize index                        | `wrangler vectorize create <name> --dimensions=<n>` or Dashboard → Vectorize                                                         |
| `hyperdrive`                  | Hyperdrive config with target DB creds | Dashboard → Hyperdrive → _Create config_ (paste the upstream connection string)                                                      |
| `services` (service bindings) | Target Worker                          | Must be deployed already — bind to a `name` that already exists in this account                                                      |
| `durable_objects.bindings`    | DO class                               | The class must be **exported from the target Worker script** AND a migration must have been deployed for it                          |

### Symptom

The CF Workers Build will fail with **one of these errors** depending
on the binding:

```
✘ [ERROR] A request to the Cloudflare API
  (/accounts/<account>/workers/scripts/<script>/versions) failed.

  You need to enable Analytics Engine. Head to the Cloudflare Dashboard
  to enable: https://dash.cloudflare.com/<account>/workers/analytics-engine
  [code: 10089]
```

Other codes you may see for the same class of mistake:

| Code  | Likely binding                                        |
| ----- | ----------------------------------------------------- |
| 10079 | D1 database not found                                 |
| 10086 | KV namespace ID not bound to this account             |
| 10089 | Analytics Engine product not enabled                  |
| 10052 | Queue does not exist                                  |
| 10081 | Vectorize index not found                             |
| 10068 | Service binding refers to a Worker that doesn't exist |

### The silent-failure trap

The GitHub check-runs API never receives the body of the deploy
error — only a generic `failure` conclusion with a link to the
dashboard build log. If you don't open the dashboard you'll see a
red ❌ on the commit with no actionable detail. The production
Worker keeps serving the previous version. This is what bit PR #35.

### Safe procedure

1. Provision the resource in the dashboard or via the relevant
   `wrangler <product> create` command.
2. Verify it appears in the dashboard at its product page.
3. **Then** open a PR that adds the binding to `wrangler.jsonc` and
   the corresponding code in `worker/`.

The reverse order (push first, provision after) means a window where
the deploy is broken — small for a portfolio, catastrophic on a
product.

## 2. Workers Builds vs Pages — different deployment APIs

CF Pages and CF Workers Builds both have GitHub integrations, but
they write to **different GitHub APIs**:

| Product           | Posts to GH            | Where to read it                                                                      |
| ----------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| CF Pages (legacy) | GitHub Deployments API | `gh api repos/.../deployments`, `repos/.../deployments/{id}/statuses`                 |
| CF Workers Builds | GitHub check-runs API  | `gh api repos/.../commits/{sha}/check-runs` (app slug `cloudflare-workers-and-pages`) |

**Migration consequence**: any CI workflow that polled
`github.rest.repos.listDeployments()` for the Pages preview URL
will time out forever after migration from Pages → Workers, because
the API surface that used to give you the URL is now empty.

The fix is to poll `checks.listForRef()` and filter by
`app.slug === "cloudflare-workers-and-pages"`. The check-run
contains `status`, `conclusion`, and a `details_url` pointing to
the CF dashboard build log — but **not** the preview URL. You have
to construct the preview URL from the branch name yourself.

See [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) for the
implemented polling logic; PR #36 was the migration commit.

## 3. Pages → Workers custom-domain switch

Declaring `main` + `run_worker_first` in `wrangler.jsonc` against a
live CF Pages project (i.e. pushing a Worker config to a repo that
the Pages git integration is still watching) **auto-deletes the
Pages project**. The deletion is silent — only the dashboard shows
a "Project not found" placeholder afterwards.

Symptom: a perfectly working site starts returning HTTP 530 for
every request shortly after the push, even though no DNS or wrangler
config seems wrong.

### Safe procedure for the migration

1. Create the new Workers project in the dashboard with the desired
   script name (e.g. `astro`).
2. **Disable** the Pages git integration (Pages project → Settings
   → Disconnect from GitHub) **before** pushing any wrangler config.
3. Move the custom domain from the Pages project to the new Worker
   via the dashboard (Worker → Settings → Domains & Routes → _Add
   Custom Domain_). DNS swap is atomic — no downtime.
4. Push the full Workers `wrangler.jsonc` and let the new CF Workers
   Build integration deploy it.

## 4. Wrangler branch-preview subdomain naming

CF Workers Builds publishes each branch as
`<branch-slug>-<worker-name>.<account-subdomain>.workers.dev`. The
slug is derived from the branch name with these rules
(**empirically verified**, not documented — verified against this
account on 2026-05-17):

- Lowercase
- `/` → `-` (so `feat/foo` → `feat-foo`)
- Non-alphanumeric → `-`
- Trailing `-` trimmed
- **Capped at 57 characters** for the branch portion. The cap comes
  from the DNS label limit (63 chars) minus the `-<worker-name>`
  suffix the platform appends. For our Worker (`astro`, 5 chars)
  the budget is 63 − 6 = 57.

**A false start to avoid**: earlier PR #37 e2e runs assumed a
truncation at 28 chars based on a stale CF docs note. Branches
longer than 28 chars but shorter than 57 (like
`feat/observability-csp-version-drift`) round-tripped through that
rule into a slug that CF never published, so the entire e2e suite
404'd. The 57-char rule is the working one.

**Beware of collisions**: two branches that differ only beyond the
57-char truncation point will share the same preview URL. Example:

- `feat/big-refactor-of-locale-routing-edge-cases-and-more-tests` →
  `feat-big-refactor-of-locale-routing-edge-cases-and-more-t` (57)
- `feat/big-refactor-of-locale-routing-edge-cases-and-more-bugs` →
  `feat-big-refactor-of-locale-routing-edge-cases-and-more-b` (57)

(Same first 56 chars, different 57th → different slugs; but a
57-char-and-longer branch that varies only at position 58+ would
collide.) Rename to something shorter or use commit-version URLs
(`<version-id>-<worker>.<subdomain>.workers.dev`) when this matters.

The CI workflow mirrors this sanitisation in its
`Derive PREVIEW_URL` step — see
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

## 5. The `BUILT_AT` / `COMMIT_SHA` injection points

The Worker's `/version` endpoint (see [`worker/version.ts`](../worker/version.ts))
reads from a generated file `worker/version.generated.ts` that
`scripts/generate-version.mjs` overwrites on every `pnpm build` /
`pnpm test`. The script tries these env vars in order:

| Env var                 | Set by                                                        |
| ----------------------- | ------------------------------------------------------------- |
| `WORKERS_CI_COMMIT_SHA` | CF Workers Builds (new name)                                  |
| `CF_PAGES_COMMIT_SHA`   | CF Pages (legacy; also exported by Workers Builds for compat) |
| `GITHUB_SHA`            | GitHub Actions                                                |
| `git rev-parse HEAD`    | Local clone with .git/                                        |
| _(fallback)_            | `"dev"` literal                                               |

The committed file ships with `"dev"` so the TypeScript graph
compiles on a fresh `pnpm install` before any build step. CI
regenerates it. **Do not delete the committed file** — `tsc` /
`vitest` will both fail on an unresolved import otherwise.

## 6. Workers Cache API survives deploys — bust it explicitly

The Workers Cache API (`caches.default`) is the regional HTTP cache
that lives in each CF colo. Its lifecycle is **not** tied to your
Worker version:

- A new deploy of the Worker code does NOT invalidate entries.
- A deploy that changes the body of `dist/index.html` will still
  serve the OLD body from the cache until the entries expire
  (`s-maxage`).

This is the opposite of what you might assume from the Workers
dashboard, where Versions and Bindings rotate atomically. For the
cache it's a footgun.

**Fix**: include a build-time salt in the cache key. We use the
first 7 chars of `COMMIT_SHA` (from
[`worker/version.generated.ts`](../worker/version.generated.ts)) as
a `_v=<sha7>` query param on the cache key Request. Each deploy
gets a fresh `<sha7>`, so the namespace rotates and the first
request after deploy is naturally a MISS that warms the new
content. See [`worker/cache.ts`](../worker/cache.ts) `buildCacheKey`
for the implementation.

**Don't**: rely on `cache.delete()` from a `fetch` event after
deploy — there's no signal to fire it from, and Workers can't
enumerate cache keys to flush them. The salt strategy is the only
robust pattern.

**Symptom of skipping this**: visitors see stale content for up to
`s-maxage` seconds after deploy, even though `wrangler deploy`
returned success and `/version` immediately reports the new SHA.
The drift-check workflow (see
[`docs/monitoring.md`](./monitoring.md)) would NOT catch this
because `/version` itself isn't cached.

## 7. Fake credentials in docs trip secret scanners

Pattern-based secret scanners (`gitleaks generic-api-key`, the
default AWS / Stripe / JWT detectors, github-secret-scanning) cannot
distinguish a realistic-fake placeholder from a real key — they
match on entropy, length, and character class. A "this is just an
example" comment doesn't help; the scanner doesn't read prose.

**Placeholders that WILL trip scanners** (do not use):

- `ABCDEFGHIJKLMNOP1234567890abcdef` — 32-hex, indistinguishable from
  a real CF Web Analytics / Mixpanel / Plausible token
- `sk-proj-abcdef1234567890abcdef1234567890` — OpenAI key shape
- `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.…` — JWT shape
- `AKIAIOSFODNN7EXAMPLE` — AWS access key ID shape (even though
  `EXAMPLE` is in the suffix, the prefix matches)

**Good placeholder conventions** (scanner-safe and obviously a
placeholder to humans):

- `<YOUR_TOKEN_HERE>` — angle brackets, uppercase, semantic
- `<your-secret-here>`
- `xxx-replace-me-xxx`
- `${MY_TOKEN}` — shell-style env-var reference
- `REPLACE_ME_WITH_YOUR_TOKEN`

Rule of thumb: a placeholder must be obviously a placeholder at a
glance, **including to a regex without context**. If you'd wonder
"is this real?" for half a second, a scanner will flag it.

For real-but-**public** tokens (CF Web Analytics site token, public
PostHog key, public Stripe `pk_*`): the right pattern is an explicit
allowlist in `.gitleaks.toml` with an inline comment explaining why
it's public:

```toml
[allowlist]
regexes = [
  # CF Web Analytics Site Token — public site-scoped identifier,
  # embedded in every served HTML by design.
  '''f267155885aa4991a341b833c47a3c08''',
]
```

If a **real** key accidentally lands in git history: rotation is
the only safe recovery. Allowlist + force-push + squash does NOT
delete the value from forks, mirrors, the GitHub event log, or
anyone's local clone. Rotate first, then clean up the repo.

This bit us on PR #38 where a `<your-32-hex>`-style example in
`docs/observability.md` tripped the `generic-api-key` rule even
though the surrounding prose clearly framed it as fake. Replacing
with `<YOUR_32_CHAR_TOKEN_HERE>` made the scanner happy and the
human reader clearer.

## 8. `gh pr` `statusCheckRollup` retains historical failures after force-push

`gh pr view <N> --json statusCheckRollup` returns the **worst**
conclusion observed per check-name over the entire PR history.
Force-pushing or squashing the branch does **not** clear the rollup.
This is a GitHub API quirk, not a `gh` CLI bug.

**Symptom**: the PR page (and `gh pr view`) shows
"FAILURE: CodeQL" in the rollup even though the latest commit on
HEAD has CodeQL green. The PR will still merge fine — the required-
checks gate is computed against HEAD, not the rollup — but it looks
alarming.

**How to check the real status on HEAD**:

```bash
HEAD_SHA=$(gh pr view <N> --json headRefOid -q .headRefOid)
gh api repos/<owner>/<repo>/commits/$HEAD_SHA/check-runs \
  --jq '[.check_runs[] | {name, status, conclusion}] | sort_by(.name)'
```

That returns the actual check-runs attached to the HEAD commit,
not the historical aggregate. Use this whenever the rollup says
something contradicts what you just pushed.

We hit this on PR #38: gitleaks was still red in the rollup three
commits after we fixed it because the rollup retained the failure
from the original push. The required-checks branch protection
was checking HEAD (which was green), so the merge button stayed
enabled the whole time. Useful CI debugging principle: **don't
trust the rollup; verify against the HEAD SHA**.

## Cross-links

- [`docs/monitoring.md`](./monitoring.md) — synthetic monitors,
  drift detection, alert channels
- [`docs/analytics-queries.md`](./analytics-queries.md) — Analytics
  Engine schema reference, SQL queries
- [`README.md`](../README.md) — top-level project overview
