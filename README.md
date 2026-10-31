# Cloudflare migration toolkit

`cfmt` checks that a site on a new origin still matches the site it is leaving. `cfmt verify` is the parity verifier. `cfmt convert` turns Netlify and Vercel rules into Cloudflare Workers static-asset `_redirects` and `_headers`, and every redirect it writes has an explicit status code.

The project home is [AIKitLLC/cf-migration-toolkit](https://github.com/AIKitLLC/cf-migration-toolkit).

License: [MIT](LICENSE)

## What the verifier compares

For each path it requests the old origin and the new origin with `redirect: 'manual'`, then checks:

- the status code
- `Location`, resolved against the response and rewritten so the old host is compared as the new host
- the status after following up to 10 redirects
- an allowlist of response headers
- the HTML `<link rel="canonical">` and `<meta name="robots">`

The headline check is `redirect-status-changed`. A Netlify rule with no status code is a **301**. A Cloudflare `_redirects` rule with no status code is a **302**. Copying the file across turns a permanent redirect into a temporary one. A permanent redirect (`301` or `308`) that becomes a non-permanent one (`302`, `303`, or `307`) is an error. A redirect that disappears (for example `301` to `200`) is an error, and a `200` that becomes a redirect is an error. Other changes between redirect status codes, such as `302` to `301` or `301` to `308`, are warnings. `200` becoming `4xx` or `5xx` is an error. A canonical change is an error. An `x-robots-tag` or meta robots change that involves `noindex` (or `none`) is an error. Other header drift is a warning. A failed request is an error.

## Requirements

- Node.js 22.12 or newer (CI runs Node.js 22)
- pnpm 10

## Run it

```bash
pnpm install
pnpm cfmt verify \
  --old https://old.example \
  --new https://new.example \
  --source live \
  --redirects ./_redirects \
  --sitemap https://old.example/sitemap.xml \
  --urls ./urls.txt \
  --crawl 20 \
  --json report.json \
  --md report.md
```

`--source` is required and may be passed only once. Use `fixture` for generated fixtures and `live` for a real site. There is no default. `--source live` opens a socket only to a global unicast address. Every connection is checked, including redirect hops, sitemap fetches, and crawl steps. A name that resolves to anything else, including loopback, private, link-local, CGNAT, benchmarking, multicast, or an IPv4-mapped address, fails the run and is not written up as an E2 report.

Exit code `1` means the report has errors. Warnings do not fail the process unless you pass `--fail-on warn`. Exit code `2` means the arguments are invalid.

`pnpm cfmt` runs the TypeScript entry with `tsx`. `pnpm build` writes `dist/`, and the `cfmt` package bin points at `dist/cli/main.js`.

### URL sources

Pass any mix of these:

| Flag | Meaning |
| --- | --- |
| `--urls file.txt` | One path or absolute URL per line. `#` comments and blank lines are skipped. |
| `--sitemap <url>` | A sitemap or a sitemap index. Nested sitemaps are fetched. |
| `--redirects <path>` | A Netlify `_redirects` file or a `netlify.toml`. Each rule becomes one concrete URL. `*` and `:placeholders` expand to the segment `sample`. |
| `--crawl <n>` | Breadth-first crawl of the old origin, same host only, at most `n` pages. |

### Other flags

| Flag | Default |
| --- | --- |
| `--headers a,b,c` | `content-type`, `cache-control`, `x-robots-tag`, `content-security-policy`, `strict-transport-security`, `x-frame-options`, `x-content-type-options`, `referrer-policy`, `permissions-policy`, `link`. `set-cookie`, `authorization`, `cookie`, `proxy-authorization`, and `x-api-key` are rejected. |
| `--concurrency` | `4` |
| `--timeout` | `10000` milliseconds per request |
| `--retries` | `2` retries after a network error. HTTP status codes are not retried. |
| `--user-agent` | `cfmt-verify/0.1 (+https://github.com/AIKitLLC/cf-migration-toolkit; parity verifier)` |
| `--json <file>` | Write the JSON report |
| `--md <file>` | Write the Markdown report |
| `--fail-on warn` | Exit 1 when any warning is present |
| `--fail-on-warn` | Same as `--fail-on warn`. Takes no value. |

If you omit both `--json` and `--md`, the Markdown report is printed to stdout. A one-line count is always printed to stderr.

The JSON summary has a `source` field (`fixture` or `live`). Fixture reports are labelled `fixture` and carry no evidence level. Only live reports are labelled `E2` (`summary.evidence` in JSON, and an `evidence: E2` line in Markdown). The Markdown file starts with `source: fixture` or `source: live`.

## Convert

```bash
pnpm cfmt convert \
  --input ./netlify.toml \
  --input ./_redirects \
  --input ./_headers \
  --input ./vercel.json \
  --out ./cloudflare \
  --source fixture \
  --json convert.json \
  --md convert.md
```

`--source` is required here too. Accepted inputs are `netlify.toml` (`[[redirects]]` and `[[headers]]`), Netlify `_redirects` and `_headers`, and `vercel.json` (`redirects`, `rewrites`, `headers`, `trailingSlash`, `cleanUrls`). A directory argument is scanned for those file names.

Netlify rules with no status become **301**. `vercel.json` with `permanent: true`, and redirects that omit `permanent`, become **308**. `permanent: false` becomes **307**. An explicit `statusCode` is kept. The choices, and the places the vendor docs disagree, are in `docs/CONVERTER.md`.

Anything Cloudflare `_redirects` cannot express is listed in the report as `unsupported`, with Bulk Redirects, Redirect Rules, or a Worker as the alternative. The command exits 1 when the result would exceed Cloudflare's limits (2,000 static redirects, 100 dynamic redirects, 1,000 characters per rule, 100 `_headers` rules, 2,000 characters per header line) and the error tells you to use Bulk Redirects.

`examples/convert-redirect-downgrade/` is the fixture for the Netlify 301 / Cloudflare 302 downgrade. Convert writes `/old-blog/* /blog/:splat 301`. Serving that file with Cloudflare's default of 302 makes `cfmt verify --source fixture` pass. Copying the Netlify file across unchanged fails with `redirect-status-changed`.

## Reports

```bash
pnpm generate:evidence
```

That command rewrites `examples/redirect-downgrade/` and `examples/convert-redirect-downgrade/`. Do not hand-edit those files. The verifier fixture serves one rule, `/old-blog/* /blog/:splat`, with no status code. The old origin uses the Netlify default (301). The new origin uses the Cloudflare default (302). The report's first error is `redirect-status-changed`. The convert fixture writes the same rule with an explicit 301 and checks that verify then passes.

Live runs go in `evidence/live/` with `--source live`. Host and site identifiers may be redacted after capture; findings stay unedited. Keep them separate from fixtures. See `evidence/live/README.md`.

## Develop

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Tests talk only to local servers and in-memory readers. They do not call third-party sites.

## CI

`.github/workflows/ci.yml` runs install, lint, typecheck, and test on `pull_request` and `push`. A deploy-time parity check looks like this:

```yaml
- name: Install
  run: pnpm install --frozen-lockfile

- name: Verify parity
  run: >
    pnpm cfmt verify
    --old ${{ vars.OLD_ORIGIN }}
    --new ${{ vars.NEW_ORIGIN }}
    --source live
    --sitemap ${{ vars.OLD_ORIGIN }}/sitemap.xml
    --json report.json
    --md report.md
    --fail-on warn
```

Publish the `report.json` and `report.md` artifacts from that job. This package is `private` and is not published to npm.

## D1 fixture

`examples/d1-netlify-static-faq/` is a fictional static FAQ moved from a Netlify-style source to a Workers static-assets config. `pnpm build:d1` builds the Astro site and runs `cfmt convert`. `pnpm verify:d1` compares a local Netlify-style server with `wrangler dev --local` and writes a fixture parity report. Nothing in that flow deploys or calls Netlify.

## Layout

`docs/ARCHITECTURE.md` describes the module boundaries. `docs/CONVERTER.md` records the status-code choices and the rules that stay unsupported. `AGENTS.md` is the note for the next session.
