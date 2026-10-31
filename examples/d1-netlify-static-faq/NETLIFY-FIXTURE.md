# Public Netlify origin for the D1 fixture

A live verify needs `cfmt verify --source live` with a public `--old` origin. The local simulator on `127.0.0.1:41751` is rejected by `--source live`. This page publishes the same fixture on a free Netlify site, then runs the E2 verify against the D1 workers.dev deploy.

Status: prepared only. No Netlify account exists yet. Creating the account and deploying need maintainer approval. Nothing here touches Cloudflare.

## What gets deployed

`pnpm build:netlify-fixture` writes `examples/d1-netlify-static-faq/netlify-fixture/dist/` (gitignored):

The script copies an explicit allowlist and refuses symlinks or any other non-regular file. The finished folder must hold exactly these 8 regular files, or the build fails:

| File | Source |
| --- | --- |
| `faq.html`, `form-stub.html`, `index.html` | Copied from `site/dist/`, with Netlify form attributes (`data-netlify`, `netlify`, `netlify-honeypot`, `data-netlify-*`) removed. This happens in the bundle only. `site/` and the workers.dev demo do not change. |
| `favicon.svg`, `robots.txt` | Byte-identical copies of `site/dist/` |
| `sitemap.xml` | `site/dist/sitemap.xml` with the host replaced by `NETLIFY_FIXTURE_ORIGIN` |
| `_redirects`, `_headers` | Generated from `site/netlify.toml` (5 redirects, one `/*` header rule). The script parses them back and fails if they differ from `netlify.toml`. |

No `netlify.toml` and no functions are shipped. The folder is already built, and `_redirects` and `_headers` work for both Drop and CLI deploys without applying the rules twice. There are no secrets. The sample form in `index.html` stays as plain HTML that posts to `/form-stub`, with no Netlify Forms markup, so Netlify has nothing to register. Form detection must also be off in the site settings (step 3). Removing the attributes does not change status, redirects, headers, canonical or robots: the local check below reports 0 errors over the same 8 URLs. An omitted redirect status stays omitted in `_redirects`, and Netlify treats it as 301 ([Netlify docs: redirect options, HTTP status codes](https://docs.netlify.com/routing/redirects/redirect-options/#http-status-codes)). The same rule exists in `netlify.toml`.

Page canonicals keep `https://plinthwick-sample.example`. The workers.dev deploy has the same canonicals, and `cfmt verify` compares canonicals across the two origins, so rewriting them only on the Netlify side would create a false `canonical-changed` error. Only the sitemap follows the real host (`cfmt verify` reads paths from it).

The script then serves `site/dist` and the bundle with the local simulator and runs `cfmt verify --source fixture` over the D1 URL set (sitemap + `old-urls.txt` + `netlify.toml`, 8 URLs). It must report 0 errors and 0 warnings. That check output goes to `netlify-fixture/check/` (gitignored) and is not evidence.

## 1. Pick the site name and build

`NETLIFY_FIXTURE_ORIGIN` is required, and the build fails if it is unset. It must be `https://<site>.netlify.app`. Any other bare https origin needs `NETLIFY_FIXTURE_ORIGIN_OVERRIDE=1`.

Suggested site name: `<site>` (origin `https://<site>.netlify.app`). If it is taken, use another name and the matching origin everywhere below.

```bash
export NETLIFY_FIXTURE_ORIGIN='https://<site>.netlify.app'
pnpm install --frozen-lockfile
pnpm build:netlify-fixture   # Node >= 22.12
```

It must print `cfmt verify: 0 error(s), 0 warning(s), 0 info(s), 8 URL(s), source=fixture`. If the final site name differs, set `NETLIFY_FIXTURE_ORIGIN` again and rebuild before the last upload.

## 2a. Deploy with Netlify Drop (recommended)

Drop is the safer path. It needs no token and no CLI, and the site is not linked to Git.

1. Sign in, or sign up for the free plan, at https://app.netlify.com.
2. Open https://app.netlify.com/drop and drag the folder `examples/d1-netlify-static-faq/netlify-fixture/dist`.
3. Site configuration → Change site name → `<site>`.
4. If the name differs from the one used in step 1, rebuild with the new origin, then Deploys → drag the folder again.

## 2b. Deploy with the Netlify CLI (fallback only)

Use this only if Drop is unavailable. The CLI is pinned to an exact version because a full-scope token is loaded while it runs.

1. Create a personal access token (User settings → Applications → Personal access tokens) with the shortest expiry offered.
2. Pass the token only as the environment variable `NETLIFY_AUTH_TOKEN`. Never paste it in a chat, a pull request, a log, or a repo file.
3. Run:

```bash
npx --yes netlify-cli@27.13.0 sites:create --name <site>
npx --yes netlify-cli@27.13.0 deploy --prod --dir examples/d1-netlify-static-faq/netlify-fixture/dist --site <site>
```

Do not run `netlify init` or `netlify link`. Do not connect a repository.

4. After the deploy, revoke the token in the Netlify UI and unset `NETLIFY_AUTH_TOKEN`.

## 3. Site settings check

Confirm both of these in the Netlify UI before the live verify:

- Forms: Site configuration → Forms → Form detection is **disabled**. If it is enabled, disable it and redeploy the folder. Under Forms, the Active forms list must be empty.
- Git: Site configuration → Build & deploy → Continuous deployment shows **no linked repository** (manual deploys only). If a repository is linked, unlink it.

## 4. Smoke check

```bash
curl -sSI "$NETLIFY_FIXTURE_ORIGIN/" | tr -d '\r' | grep -i '^x-robots-tag: noindex$'
curl -sSI "$NETLIFY_FIXTURE_ORIGIN/ein" | tr -d '\r' | grep -iE '^(HTTP|location)'          # 301 -> /faq
curl -sSI "$NETLIFY_FIXTURE_ORIGIN/estimated-tax-dates" | tr -d '\r' | grep -i '^HTTP'      # 301 (Netlify default)
curl -sS "$NETLIFY_FIXTURE_ORIGIN/robots.txt"                                                # Disallow: /
```

## 5. Live verify (E2)

```bash
pnpm cfmt verify \
  --old "$NETLIFY_FIXTURE_ORIGIN" \
  --new https://d1-netlify-static-faq.<subdomain>.workers.dev \
  --source live \
  --sitemap "$NETLIFY_FIXTURE_ORIGIN/sitemap.xml" \
  --urls examples/d1-netlify-static-faq/old-urls.txt \
  --redirects examples/d1-netlify-static-faq/site/netlify.toml \
  --fail-on-warn \
  --json evidence/live/d1-netlify-static-faq.json \
  --md evidence/live/d1-netlify-static-faq.md
```

This is the same URL set as `parity/report.md` (8 URLs). Under `evidence/live/` the files get a UTC stamp in their names; stderr prints `wrote <path>` twice. Do not edit them. The Markdown must start with `source: live` then `evidence: E2`.

Netlify adds its own response headers, for example `server`, `x-nf-request-id`, `age` and `cache-status` ([Netlify docs: custom headers](https://docs.netlify.com/routing/headers/)). If the verifier flags a mismatch, do not edit the report: record the finding and its reason in the PR's Exceptions section, and treat the run as FAIL until it is reviewed.

## 6. Evidence PR

```bash
git switch -c evidence/d1-live-verify-$(date -u +%Y%m%d)
git add evidence/live/d1-netlify-static-faq-*.json evidence/live/d1-netlify-static-faq-*.md
git commit -m "docs(d1): add live E2 verify report"
```

The PR body lists the date, both origins, the toolkit commit SHA (`git rev-parse HEAD`), the exact command, totals, pass/fail per check (status, redirects, headers, canonical, robots), and an Exceptions section. Do not merge: Security review comes first.

## Teardown

After the live verify is accepted, the Netlify site can be deleted from Site configuration → Danger zone. That needs maintainer approval.
