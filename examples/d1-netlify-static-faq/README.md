# D1: Netlify-style static FAQ to Cloudflare Workers

DEMO: fictional product / sample site, not a real company.

Plinthwick Sample Desk is a fictional name. A web search on 15 October 2026 did not find a company or trademark using that name. The site has no gambling content and no customer data.

The sample is a 10-question FAQ on EIN and estimated taxes for small LLCs. Each answer quotes irs.gov, cites the page URL, records the access date 15 October 2026, and ends with "information, not tax advice". Figures and deadlines are the IRS sentences, not a paraphrase. FAQPage JSON-LD is rendered from the same strings as the visible answer, and `tests/d1/d1-demo.test.ts` checks that they match.

## What this proves

The source is an Astro static site plus `site/netlify.toml`:

- `/ein` to `/faq` with status 301
- `/apply-for-ein` to `/faq` with status 302
- `/estimated-tax-dates` to `/faq` with no status (Netlify's default is 301)
- `/library/*` to `/faq` with status 301
- `/llc-ein` to `/faq` with status 200 (rewrite)
- security, cache, and `X-Robots-Tag: noindex` headers on `/*`
- one Netlify-style form, `sample-question`

`cfmt convert` writes `_redirects` and `_headers`. Every redirect line includes a status code, so the omitted Netlify status stays 301 instead of becoming Cloudflare's default 302.

The old origin is a local server that applies `netlify.toml`. The new origin is `wrangler dev --local`. There is no Netlify account and no Cloudflare deploy.

## Commands

From the repository root:

```bash
pnpm build:d1
pnpm verify:d1
pnpm rollback:d1
```

`pnpm verify:d1` writes `parity/report.json` and `parity/report.md` with `--source fixture`. Fixture reports have no evidence level. It also requires `noindex` on every path in `old-urls.txt` and on a 404. `pnpm rollback:d1` writes `rollback/simulated-local.json`. The label is `simulated-local`. The workers.dev rollback timing is in `GO-LIVE.md` and `scripts/d1/measure-rto.sh`, and it runs only after maintainer approval.

## Form

Netlify Forms are HTML, not a redirect or header rule. `cfmt convert` does not emit a Workers equivalent. `conversion/form-unsupported.json` records the form as unsupported. `GET /form-stub` is a static stub. The local simulator accepts a submission and discards the body. Workers Static Assets do not run the Netlify form handler.

## Layout

| Path | Role |
| --- | --- |
| `site/` | Astro source and `netlify.toml` |
| `wrangler.jsonc` | Static-assets Worker config, plus `src/invoke.js` on `/__cfmt-invoke` only. That response and the pages both send the converted `_headers` security headers, including `X-Robots-Tag: noindex` |
| `conversion/` | Converter report, `_redirects`, `_headers`, form report |
| `parity/` | Fixture parity report and content hashes |
| `rollback/` | `simulated-local` timing |
| `screenshots/` | Mobile screenshots of the local Worker |
| `RUNBOOK.md` | Local parity and the `simulated-local` label |
| `GO-LIVE.md` | Workers.dev deploy and rollback timing, after maintainer approval |
| `ARCHITECTURE.md` | How the local pieces fit together |
