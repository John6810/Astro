# Testing

Two layers, both protecting the acceptance criteria from regression.

## Unit tests — `vitest` on `workerd`

`@cloudflare/vitest-pool-workers` runs every test file inside the real
Cloudflare Workers runtime (`workerd`) with the bindings declared in
`wrangler.jsonc`. Tests call the Worker entry through
`SELF.fetch("https://example.com/…")` and assert on the real `Response`
the Worker returns — same `env.ASSETS` binding, same HTMLRewriter,
same headers.

### Layout

```
worker/__tests__/
├── routing.test.ts          # locale SSR, bot bypass, Accept-Language,
│                              cookie override, 404, hreflang, sitemap,
│                              JSON-LD identity
├── security-headers.test.ts # all 7 headers, CSP shape, nonce uniqueness,
│                              /csp-report endpoint (204 / 400 / 429)
└── vary-scope.test.ts       # Vary present only on /, absent everywhere else
```

### Running locally

```bash
pnpm test           # astro build && vitest run — single pass
pnpm test:watch     # vitest watch mode (no rebuild between runs)
pnpm test:csp       # security-headers.test.ts only
```

`pnpm test` builds the site first because `env.ASSETS` reads from
`dist/`. If `dist/` is stale you'll see false 404s in the routing
tests.

### Adding an AC

1. Pick the test file (`routing.test.ts` for behaviour, `security-headers.test.ts` for headers/CSP, `vary-scope.test.ts` for Vary).
2. Inside the matching `describe` block, add an `it(`AC{n}: <desc>`, …)`.
3. Use `SELF.fetch("https://example.com/<path>", { headers, redirect: "manual" })`. Always pass `redirect: "manual"` if you assert on the redirect status.
4. Assert on the `Response`: `status`, `headers.get(...)`, `text()` if you need the body.

Example skeleton:

```ts
it("AC42: my new behaviour", async () => {
  const res = await SELF.fetch("https://example.com/foo", {
    headers: { "X-Custom": "bar" },
    redirect: "manual",
  });
  expect(res.status).toBe(200);
  expect(res.headers.get("x-foo")).toBe("bar");
});
```

## E2E tests — Playwright (Chromium + Firefox)

The E2E suite (`tests/e2e/acceptance.spec.ts`) drives a real browser
against a deployed URL — by default the Cloudflare Workers Builds
preview URL set per-PR by the platform, or `jonathan-aerts.dev` for
prod smoke runs. One `test()` per acceptance criterion, named
`AC{n}: …`.

Why Playwright in addition to unit tests:

- Some ACs need a real browser to verify: CSP enforcement,
  `console`/`pageerror` events, network beacons (GoatCounter pings),
  `<script nonce>` actually executing.
- The CSP `'strict-dynamic'` experiment (`docs/security-headers.md`)
  needs cross-browser confirmation. Firefox + Chromium have subtly
  different CSP3 support.
- It's the last line of defence before main — a regression that slips
  past unit tests will surface here.

### Running locally

```bash
pnpm test:e2e:install                              # one-time: Chromium + Firefox
pnpm test:e2e                                      # against jonathan-aerts.dev
PREVIEW_URL=https://my-pr-preview.workers.dev \
  pnpm test:e2e                                    # against any preview
```

By default the E2E run targets prod (`https://jonathan-aerts.dev`).
Override with `PREVIEW_URL` for any preview deployment. **Never
target prod in CI** — the workflow always reads `PREVIEW_URL` from
the CF Workers Builds Deployment status; if that step fails, the
E2E step fails too.

### Reading a failed Playwright run

- HTML report uploaded as a CI artifact (`playwright-report` artifact
  on the failed `e2e` job).
- Traces are captured on first retry (`trace: "on-first-retry"`).
  Open the report locally with `pnpm exec playwright show-report`.
- Each failed test ships a screenshot.

### Adding an AC to the E2E suite

Follow the naming convention `AC{n}: <desc>` so the test names stay
in sync with the acceptance list. Where the AC is HTTP-level, use
`request.fetch()` / `request.get()` / `request.post()`. Where the AC
needs page rendering or browser-level CSP enforcement, use
`page.goto()` and listen on `page.on('console')` / `page.on('pageerror')`.

For headers-only checks the shared helpers `expectAllHeaders` and
`expectNoHeader` are at the top of the spec file.

## CI flow

The workflow at `.github/workflows/ci.yml` has three jobs:

```
static  ─► unit  ─► e2e
```

- **static**: format check (Prettier), Astro type-check
  (`astro check`), `pnpm build`. Uploads `dist/` as a build artifact.
- **unit**: vitest run inside `workerd`. ~30s.
- **e2e**: polls the GitHub Deployments API for a Cloudflare Workers
  Builds deployment on the current commit. When the deployment is
  successful, it extracts `environment_url` and runs Playwright
  against that URL. Times out after 12 min if no successful deployment
  appears.

### Recommended branch protection

On `main`, mark `static`, `unit`, and `e2e` as required status checks
in **Settings → Branches → Branch protection rules**. With those
enabled, a PR cannot merge with an AC regression.

### Interpreting failures

| Job    | Failure typically means                                                                                                                |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| static | TS error / unformatted file / build broke                                                                                              |
| unit   | Worker logic regression — locale routing, headers, CSP shape, /csp-report endpoint                                                     |
| e2e    | Live preview broke — CSP violation in a real browser, missing security header, hreflang/JSON-LD mismatch, or the CF build never landed |

When `e2e` says `Timed out waiting for CF Workers Builds preview`, it
means the Workers Builds pipeline didn't post a successful deployment
within 12 min. Check the Cloudflare dashboard build log; the most
common cause is `wrangler.jsonc` validation or `pnpm build` failing
inside the CF build env.

## Coverage

`vitest run --coverage` (istanbul) writes a report to `coverage/`.
The acceptance contract is ≥ 90 % line coverage on `worker/index.ts`
and `worker/security-headers.ts`. The CI workflow does not block on
coverage today, but the local report is the source of truth when
asking "is this branch worth merging?".
