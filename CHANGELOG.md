# Changelog

## Unreleased

### Added

- `header-added` (info) when the new origin sends a hardening header the old origin did not: `content-security-policy`, `referrer-policy`, `x-frame-options`, `x-content-type-options`, `permissions-policy`, or `strict-transport-security`. `x-robots-tag` is not in that list. Adding `noindex` or `none` is an error. Reports count info. Info does not fail the process, including with `--fail-on-warn`.
- The default header allowlist includes `x-content-type-options` and `permissions-policy`.
- `--fail-on-warn` is the same exit rule as `--fail-on warn`. `--headers` rejects `set-cookie`, `authorization`, `cookie`, `proxy-authorization`, and `x-api-key`.
- Verify reports under `evidence/live/` use a UTC timestamp in the file name and are written with a temporary file plus `rename`.
- D1 go-live timing is `scripts/d1/measure-rto.sh`. The tail session is proven with a ready nonce, stopped when the smoke ray is in the file, and reduced to an extracted event. The raw tail log is gitignored. Run the script only after maintainer approval.

### Changed

- Published files in `evidence/live/` may replace host and site identifiers after capture. Findings stay unedited.
- `content-type` is compared as a parsed media type. `text/html` and `text/html; charset=utf-8` match. Content-Type on a 3xx response is ignored.
- The D1 fixture HSTS value is `max-age=31536000; includeSubDomains`. `preload` is omitted.

## 0.2.0 — 2026-10-11

### Added

- `cfmt convert` writes Cloudflare Workers static-asset `_redirects` and `_headers` from Netlify `netlify.toml`, `_redirects`, `_headers`, and from `vercel.json` redirects, rewrites, headers, `trailingSlash`, and `cleanUrls`.
- Every written redirect has an explicit status code. A missing Netlify code becomes 301. Vercel `permanent: true`, and a `redirects` entry that omits `permanent`, becomes 308. `permanent: false` becomes 307. An explicit `statusCode` is kept.
- Unsupported rules are reported instead of dropped. The report names Bulk Redirects, Redirect Rules, or a Worker. Query matches, country, language, role, cookie, `has` / `missing`, domain-level redirects, 404 rewrites, and external 200 proxies are in that list.
- Cloudflare's `_redirects` and `_headers` limits fail the command with a message that points at Bulk Redirects.
- `examples/convert-redirect-downgrade/` shows the Netlify 301 / Cloudflare 302 downgrade fixed by convert. `docs/CONVERTER.md` cites the Netlify, Vercel, and Cloudflare docs, including the readings that disagree.

## 0.1.0 — 2026-10-11

### Added

- `cfmt verify` compares an old origin with a new origin.
- Sources: `--urls`, `--sitemap` (sitemap index included), `--redirects` (`_redirects` or `netlify.toml`), and `--crawl`.
- Checks with stable ids: `status-changed`, `redirect-status-changed`, `redirect-target-changed`, `header-changed`, `header-missing`, `canonical-changed`, and `fetch-failed`.
- `redirect-status-changed` is an error when a permanent redirect (301 or 308) becomes a non-permanent one (302, 303, or 307), and when a redirect appears or disappears. The 301-to-302 case is the Netlify-to-Cloudflare default-status downgrade.
- JSON and Markdown reports. `--source fixture|live` is required, may be passed only once, and is stored on the JSON summary and the first Markdown line. Fixture reports are labelled `fixture` and have no evidence level. Live reports are labelled `E2`. `--source live` connects only to global unicast addresses, on every connection, and a blocked connection does not produce an E2 report.
- `--fail-on warn`, concurrency, timeout, network-only retries, and a named user agent.
- Fixture evidence at `examples/redirect-downgrade/`, generated rather than written by hand.
- `evidence/live/` as the place for unedited live reports.
- GitHub Actions CI for install, lint, typecheck, and test.
