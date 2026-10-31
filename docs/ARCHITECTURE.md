# Architecture

`cfmt` has two commands. `cfmt verify` compares an old origin with a new one. `cfmt convert` turns Netlify (`netlify.toml`, `_redirects`, `_headers`) and Vercel (`vercel.json`) rules into Cloudflare Workers static-asset `_redirects` and `_headers`, and it always writes an explicit status code. The modules stay decoupled: convert reuses the redirect parsers and does not import the fetcher or the comparators.

## Dependency direction

```
cli  →  verify  →  comparators
                 →  fetcher
                 →  url-sources
                 →  reporters
     →  convert →  redirects
url-sources  →  redirects, html, http (PageReader)
fetcher      →  http (PageReader)
comparators  →  domain, normalize, headers, html
reporters    →  domain
convert      →  redirects, domain (report source only)
redirects, domain, normalize, headers  →  (no I/O)
```

`src/cli` is the composition root. `ParityVerifier` depends on the `PageReader` interface, not on `fetch`. Comparators do not fetch. Reporters do not know how a finding was produced. URL sources do not compare responses. `src/convert` does not import `src/cli`, `src/fetcher`, `src/comparators`, or `src/demo`.

Patterns in use:

- **Strategy** — `Comparator`, `UrlSource`, and `ReportRenderer` are swappable.
- **Composite** — `CompositeUrlSource` merges file, sitemap, and redirect sources.
- **Factory** — `createComparators()` builds the default pipeline.
- **Facade** — `ParityVerifier` runs capture and comparison for a path list.

## Pipeline

1. `parseVerifyArgs` reads the CLI. `--source fixture|live` is required.
2. `collectPaths` asks each URL source for request paths (`pathname` + query, no hash).
3. `PoliteFetcher` performs each GET with `redirect: 'manual'`, a shared semaphore, a timeout, and retries only when the error is a network or timeout failure.
4. `snapshotPage` stores the first response and follows at most 10 `Location` hops.
5. Each comparator emits zero or more findings: `{ path, check, severity, old, new }`.
6. `buildReport` sorts findings so errors come first and `redirect-status-changed` leads the errors.
7. JSON and Markdown renderers write the files through a temporary file and `rename`. A path under `evidence/live/` gets a UTC timestamp in the name. `exitStatusForReport` returns 1 when there is an error, or a warning if `--fail-on warn` or `--fail-on-warn` is set. Info does not fail the process.

## Modules

### url-sources

| Source | Input | Output |
| --- | --- | --- |
| `FileUrlSource` | Text file of paths or absolute URLs | Request paths |
| `SitemapUrlSource` | Sitemap URL, including a sitemap index | Request paths from `<loc>` |
| `RedirectsUrlSource` | `_redirects` or `netlify.toml` | One concrete path per rule |
| `CrawlUrlSource` | Old origin and a page limit | Same-host BFS paths |

`*` and `:name` in a redirect source expand to the segment `sample` (`SAMPLE_SEGMENT`). Query placeholders such as `id=:id` become `id=sample`. Role, country, and language conditions are kept on the rule and are not evaluated; the source path is still requested.

Sitemap XML is read by a small `<loc>` extractor (comments stripped, CDATA and the usual entities handled). HTML uses `node-html-parser`.

### fetcher

`PoliteFetcher` implements `PageReader`. Defaults: concurrency 4, timeout 10 seconds, 2 retries, user agent `cfmt-verify/0.1 (+https://github.com/AIKitLLC/cf-migration-toolkit; parity verifier)`.

A live run gives that reader an undici `Agent` whose connect hook resolves the host and continues only when every answer is global unicast (`ipaddr.js` `range() === 'unicast'`). A caller-supplied connect function is wrapped by that check. The socket is opened to that address, including on redirect hops, sitemap fetches, and crawl steps. `ParityVerifier` refuses `source: 'live'` unless the reader can install the guard, and a blocked connection does not build an E2 report. Fixture runs leave the guard off so the local servers stay reachable.

Document bodies are read only for non-redirect responses whose content type looks like HTML or XML, or for a 2xx response with no content type. The read stops at 1 MiB.

### comparators

| Check | When it fires | Severity |
| --- | --- | --- |
| `redirect-status-changed` | The first statuses differ and at least one is 301, 302, 303, 307, or 308 | **error** when 301/308 becomes 302, 303, or 307, or when a redirect appears or disappears; otherwise warning |
| `status-changed` | First status differs, or the final status differs and is not the same pair | **error** when 200 becomes 4xx/5xx; otherwise warning |
| `redirect-target-changed` | Normalized `Location` values differ | error |
| `header-changed` | Allowlisted header present on both sides with different values | warning, or error for `x-robots-tag` involving `noindex` or `none` |
| `header-missing` | Allowlisted header, or meta robots, present on only one side, and the new origin did not add a hardening header | warning, or error when `noindex` / `none` is gained or lost |
| `header-added` | A hardening header is absent on the old origin and present on the new one | info |
| `canonical-changed` | HTML canonical or `Link` rel=canonical differs after host swap | error |
| `fetch-failed` | The reader throws for one or both origins | error |

`Location` and canonical URLs are resolved against the response URL. If the host is the origin that produced the URL, the protocol, hostname, and port are rewritten to the new origin before the two sides are compared. An external host is left as-is. The `link` allowlist entry is the canonical target of the `Link` header, not the raw header string. When a redirect was followed, landing-response headers are compared again and labeled `final <header>`.

Hardening headers are `content-security-policy`, `referrer-policy`, `x-frame-options`, `x-content-type-options`, `permissions-policy`, and `strict-transport-security`. A value that shows up only on the new origin is `header-added` at info. `x-robots-tag` is not in that list. Adding `noindex` or `none`, losing it, or changing that header stays `header-missing` or `header-changed` at error. A different HSTS value on both sides stays `header-changed` at warning.

`content-type` is parsed. The media type is compared without regard to case, and parameter order does not matter. `text/html` and `text/html; charset=utf-8` are the same value, because HTML defaults to UTF-8 when the new or old side omits charset. Any other charset difference stays a warning. `Content-Type` on a 3xx response is ignored, whether it is missing or different, because that response has no body. The landing response after a redirect is still compared.

A 301-to-302 downgrade therefore produces both `redirect-status-changed` (error) and `status-changed` (warning). The Markdown report shows the error section first, with `redirect-status-changed` at the top of that section.

### reporters

`renderJsonReport` writes:

```json
{
  "summary": {
    "source": "fixture",
    "oldOrigin": "…",
    "newOrigin": "…",
    "urlCount": 1,
    "counts": { "error": 1, "warning": 1, "info": 0 },
    "byCheck": {}
  },
  "findings": []
}
```

`source` is always present. Fixture reports have no evidence level. Live reports add `"evidence": "E2"`. There is no timestamp, so a fixture run on fixed ports is stable.

`renderMarkdownReport` starts with the line `source: fixture` or `source: live` and nothing before it. A live report follows that line with `evidence: E2`. A fixture report does not.

### cli

`runCli` returns 2 for argument errors and otherwise the verifier's exit status. `src/index.ts` exports the parsers, the expander, and `ParityVerifier` for other commands. It does not start the process.

### demo

`src/demo/redirect-origin-server.ts` is the local stand-in used by the redirect-downgrade fixture. It is not part of the public verifier. The old server's default status is 301 (Netlify). The new server's default is 302 (Cloudflare). An explicit status on the rule wins on both. `pnpm generate:evidence` points that fixture at ports 41731 and 41732 and writes `examples/redirect-downgrade/`.

## `cfmt convert`

`convertProject` is the facade. Parsers in `src/redirects` (`parseNetlifyConfig`, `parseNetlifyHeadersFile`, `parseVercelConfig`, and `migrationFromRedirectsFile`, which sits on `parseRedirectsFile`) produce a `MigrationProject`. Classify functions are the strategy: each redirect, header rule, or platform behavior becomes a written Cloudflare line or an `unsupported` entry. `resolveRedirectStatus` is the status policy. `translateEndpoint` maps Netlify `*` / `:splat` and Vercel `:path*` onto Cloudflare's one splat and `:placeholder` names. `assertCloudflareLimits` refuses a draft that exceeds the static, dynamic, per-rule, or `_headers` limits.

Static redirects are written before dynamic ones. The JSON and Markdown reports are rendered in `src/convert`, not by the verifier reporters, and they carry the same `source: fixture|live` rule. `docs/CONVERTER.md` records the status-code choices, including where the Netlify, Vercel, and Cloudflare docs disagree.

The verifier is the check that a converted file still matches the old origin. `examples/convert-redirect-downgrade/` converts `/old-blog/* /blog/:splat` with no status into an explicit 301 and confirms verify passes when that file is served with Cloudflare's default of 302.

## Report provenance

Every report is either a fixture or a live run.

- `examples/` holds fixture output (`--source fixture`), including `examples/redirect-downgrade/` and `examples/convert-redirect-downgrade/`.
- `evidence/live/` holds live output (`--source live`), for example the D1 demo. Host and site identifiers may be redacted after capture. Findings stay unedited.

The two trees are not interchangeable. The `source` field is how a later reader tells them apart.
