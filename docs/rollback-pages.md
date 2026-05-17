# Rollback to Cloudflare Pages

If the CF Workers migration causes a production incident, this is the
quickest path back to the pre-migration setup.

**Time to roll back: ~5 minutes** (DNS propagation included since the
domain is already on Cloudflare; the actual reassignment is instant).

## Prerequisites

- You have admin access to the Cloudflare dashboard for the
  `jonathan-aerts.dev` zone.
- The Pages project `jonathan-aerts-dev` still exists (it should until
  PR #31 is merged).
- `functions/_middleware.ts` is still on `main` (it is, until PR #31).

## Steps

### 1. Detach the custom domain from the Worker (1 min)

1. Cloudflare dashboard → **Workers & Pages** → `portfolio` Worker.
2. **Settings** → **Domains & Routes**.
3. Next to `jonathan-aerts.dev`, click **Remove**. Confirm.
4. CF clears the DNS routing entry for that domain on the Worker.

### 2. Reattach the custom domain to the Pages project (1 min)

1. Cloudflare dashboard → **Workers & Pages** → `jonathan-aerts-dev` Pages project.
2. **Custom domains** tab → **Set up a custom domain**.
3. Enter `jonathan-aerts.dev`, accept the auto-DNS reassignment offer.
4. CF re-routes the apex to Pages within ~30 seconds.

### 3. Verify (~2 min)

Confirm the rollback worked:

```bash
# These should all succeed and the response Server / build fingerprint
# should match the pre-migration Pages deploy:
curl -sI https://jonathan-aerts.dev/                                    # 200, lang=en
curl -sI -H "Accept-Language: fr-BE,fr;q=0.9" https://jonathan-aerts.dev/ # 302 → /fr/
curl -sI -A "ClaudeBot/1.0" https://jonathan-aerts.dev/                  # 200, no redirect

# Check headers — Pages adds these defaults, Workers does not:
curl -sI https://jonathan-aerts.dev/ | grep -iE "access-control-allow-origin|x-content-type-options|referrer-policy"
# All three present = back on Pages.
```

If the Accept-Language redirect comes back (step `fr-BE → 302`),
`functions/_middleware.ts` is running again and you are fully rolled
back.

### 4. (Optional) Re-deploy the latest Pages build

If something on `main` is broken and the Pages project is serving a
stale build, force a fresh build:

1. Dashboard → Pages project → **Deployments** → **Retry deployment**
   on the latest commit, OR
2. Empty commit to trigger rebuild:
   ```bash
   git commit --allow-empty -m "chore: trigger pages rebuild"
   git push origin main
   ```

## Why the rollback works

- The CF Pages project (`jonathan-aerts-dev`) keeps building and
  deploying on every push to `main` even while the Worker is serving
  the apex — that is by design until PR #31 disables the Pages auto-
  deploy. So when we point the domain back, it gets the latest
  `main` build, not a stale one.
- `functions/_middleware.ts` is intentionally preserved across the
  migration PRs precisely so this rollback works without code changes.

## When to delete this file

After PR #31 has been merged and stable in production for at least a
week (or whatever your confidence horizon is). At that point the Pages
project will be deleted and rollback would mean recreating it — which
takes longer than rolling forward.
