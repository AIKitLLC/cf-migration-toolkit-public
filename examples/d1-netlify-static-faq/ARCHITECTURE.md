# D1 architecture

The demo sits beside the toolkit. It does not change the verifier's checks. `cfmt convert` stays free of the fetcher and the comparators. The demo server is allowed to call both the Netlify parser and `resolveRedirectStatus`, so the omitted status it serves is the same 301 the converter writes.

## Pieces

| Piece | Role |
| --- | --- |
| `site/` | Astro 7 static site. FAQ text, JSON-LD, and the citation line come from `visibleAnswer()` |
| `site/netlify.toml` | The Netlify-style source of truth for redirects, headers, and the implied form |
| `src/demo/netlify-static-origin/` | Local stand-in for that file. `NetlifyRequestPlanner` is the facade. `NetlifyPattern` matches a rule. `StaticAssetResolver` maps a path to a built file. `headerRulesForPath` merges `/*` headers |
| `scripts/d1/prepare-assets.ts` | Builds the site, runs `cfmt convert`, copies `_redirects` and `_headers`, writes the form report |
| `scripts/d1/start-wrangler-dev.ts` | Starts `wrangler dev --local` with Cloudflare credential variables removed from the child environment |
| `scripts/d1/verify-parity.ts` | Compares the simulator with Wrangler and writes the fixture report |
| `scripts/d1/measure-rollback.ts` | Runs two local Workers and times a switch. The label is `simulated-local` |
| `wrangler.jsonc` | Assets-only Worker. No Worker script, because a script is not required for `_redirects` and `_headers` |

## Request path on the old origin

1. A `POST` to `/form-stub` is drained and discarded, then answered with `303` to `/form-stub`.
2. Otherwise the first matching redirect wins. A rule with no status uses `resolveRedirectStatus`, which returns 301 for Netlify. Status 200 reads the target file and stays on the request URL. Any other status sends `Location`.
3. A rule does not override an existing file unless `force` is set. That is Netlify's shadowing behavior. Cloudflare always applies `_redirects`. None of the demo sources are also files, so the two sides still agree.
4. Headers from `/*` are attached to the response, including redirects, together with a content type when a file is served. `Strict-Transport-Security` is `max-age=31536000; includeSubDomains`. `preload` is omitted because workers.dev is a public suffix and the token would be a preload-list commitment on a custom domain. `src/invoke.js` repeats that `/*` rule for `/__cfmt-invoke`.

## Request path on the new origin

Wrangler serves `site/dist` with `html_handling: auto-trailing-slash` and `not_found_handling: none`. `_redirects` and `_headers` in that directory are the converter output. `X-Robots-Tag: noindex` is one of those headers.

## What parity covers

`cfmt verify --source fixture` loads the sitemap, `old-urls.txt`, and one sample URL per redirect rule. It compares status, redirect target, the header allowlist, canonical, and meta robots. The demo script also hashes 200 response bodies and fails if those hashes differ. Redirect response bodies are not required to match.

## Rollback

Production rollback would be a Workers version pointer. This local measurement does not deploy, so the measured action is a local switch between two already running `wrangler dev --local` processes. That measurement is `simulated-local`. The workers.dev measurement is in `GO-LIVE.md`, and it runs only after maintainer approval.
