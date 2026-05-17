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
slug is derived from the branch name with these rules:

- Lowercase
- `/` → `-` (so `feat/foo` → `feat-foo`)
- Non-alphanumeric → `-`
- Truncated to **28 characters**
- Trailing `-` trimmed

**Beware of collisions**: two branches that differ only beyond the
28-char truncation point will share the same preview URL. Example:

- `feat/big-refactor-of-locale-routing-edge-cases` →
  `feat-big-refactor-of-locale-` (28 chars)
- `feat/big-refactor-of-locale-routing-tests` →
  `feat-big-refactor-of-locale-` (28 chars, same!)

The second push **overwrites** the first preview. CF doesn't warn.
Rename to something shorter or use commit-version URLs
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

## Cross-links

- [`docs/monitoring.md`](./monitoring.md) — synthetic monitors,
  drift detection, alert channels
- [`docs/analytics-queries.md`](./analytics-queries.md) — Analytics
  Engine schema reference, SQL queries
- [`README.md`](../README.md) — top-level project overview
