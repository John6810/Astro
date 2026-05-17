# Astro — jonathan-aerts.dev

Personal portfolio site. Astro v6 + Tailwind v4, deployed to Cloudflare
Workers (Static Assets) at https://jonathan-aerts.dev/.

## Architecture

- **Frontend**: Astro static build with i18n routing (`en`, `fr`, `ja`)
- **Runtime**: Cloudflare Worker (`worker/index.ts`) does
  `Accept-Language` + `Cookie` based locale negotiation on `/` only,
  bot UA bypass, CSP nonce stamping via HTMLRewriter
- **Static assets**: served by the Worker's `env.ASSETS` binding from
  `dist/` (Astro's build output)
- **Security**: 7 response headers + nonce-based CSP — see
  [`docs/security-headers.md`](./docs/security-headers.md)
- **Observability**: 5-signal stack (GoatCounter traffic + CF Web
  Analytics RUM + Workers Analytics Engine custom events + Better
  Stack synthetics + `/version` drift detection). Top-level map in
  [`docs/observability.md`](./docs/observability.md); query recipes
  in [`docs/analytics-queries.md`](./docs/analytics-queries.md);
  external monitors and drift workflow in
  [`docs/monitoring.md`](./docs/monitoring.md). CF-specific
  operational landmines (binding pre-provisioning, Pages → Workers
  API split, branch-slug truncation collisions, edge cache
  invalidation strategy) are documented in
  [`docs/cloudflare-gotchas.md`](./docs/cloudflare-gotchas.md).
- **Edge cache**: 5-min TTL on `/`, `/fr/`, `/ja/` via the Workers
  Cache API, salted by commit SHA so deploys invalidate
  automatically. Per-request CSP nonce is preserved across hits.

## Tests

See [`docs/testing.md`](./docs/testing.md) for the full guide.

Quick reference:

```bash
pnpm install                                # one-time
pnpm test                                   # unit tests (vitest)
pnpm test:csp                               # security headers tests only
pnpm test:e2e:install                       # one-time: Chromium + Firefox
pnpm test:e2e                               # E2E against jonathan-aerts.dev
PREVIEW_URL=https://… pnpm test:e2e         # E2E against a workers.dev preview
```

CI on every PR: static → unit → e2e (E2E waits for the Cloudflare
Workers Builds check-run on the head SHA, then targets the branch
preview alias — see
[`docs/cloudflare-gotchas.md`](./docs/cloudflare-gotchas.md) §2 for
why the older "Deployments API" approach broke after the Pages →
Workers migration).

## Development

```bash
pnpm dev               # astro dev — fast local iteration
pnpm wrangler:dev      # astro build && wrangler dev — full Worker locally
pnpm wrangler:deploy   # deploy to CF Workers
pnpm wrangler:tail     # stream Workers Logs
```

## Documentation

- [`docs/security-headers.md`](./docs/security-headers.md) — security
  headers, CSP strategy, `/csp-report` endpoint, strict-dynamic notes
- [`docs/testing.md`](./docs/testing.md) — testing layout, how to add
  new ACs, how to debug CI failures
- [`docs/analytics-queries.md`](./docs/analytics-queries.md) —
  Workers Analytics Engine schema, SQL queries, sample-interval
  weighting
- [`docs/monitoring.md`](./docs/monitoring.md) — external synthetic
  monitoring (Better Stack, 11 monitors), drift detection workflow
- [`docs/cloudflare-gotchas.md`](./docs/cloudflare-gotchas.md) —
  operational landmines from the CF Pages → Workers migration
- [`docs/observability.md`](./docs/observability.md) — 5-signal
  observability map (RUM + traffic + custom events + synthetics +
  drift) and the CF Web Analytics setup walkthrough
