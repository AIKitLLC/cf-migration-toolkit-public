# Converter

`cfmt convert` reads Netlify and Vercel routing rules and writes Cloudflare Workers static-asset `_redirects` and `_headers`. It reuses the redirect parsers in `src/redirects` and does not import the fetcher or the comparators. See `docs/ARCHITECTURE.md`.

Every written redirect includes a status code. Cloudflare's default of 302 is never left implicit.

## Status codes

| Source | What we write |
| --- | --- |
| Netlify redirect with no status | 301 |
| Netlify or Vercel status written by the operator | that status, when Cloudflare can express it |
| `vercel.json` `permanent: true` | 308 |
| `vercel.json` `permanent` omitted on a `redirects` entry | 308 |
| `vercel.json` `permanent: false` | 307 |
| `vercel.json` `statusCode` together with `permanent` | the `statusCode` |
| Netlify status 200 to a relative URL whose pattern fits | 200 |
| Vercel rewrite to a relative URL whose pattern fits | 200 |

### Netlify default

Netlify says an omitted redirect status is 301:

- [Redirect options](https://docs.netlify.com/manage/routing/redirects/redirect-options/) — "If left unspecified, the default is `301`."
- [Redirects and rewrites](https://docs.netlify.com/manage/routing/redirects/overview/) — `status` is "The HTTP status code you want to use in that redirect; `301` by default."

Cloudflare Workers static assets use 302 when `_redirects` omits the code:

- [Redirects](https://developers.cloudflare.com/workers/static-assets/redirects/) — "`code` `number` (default: 302)" and "302 is used as the default status code."

Copying a status-less Netlify rule into `_redirects` therefore turns a permanent redirect into a temporary one. `redirect-status-changed` is the verifier check for that. Convert always prints the 301.

### Vercel `permanent` and `statusCode`

The `redirects` object in `vercel.json`:

- [Static Configuration with vercel.json](https://vercel.com/docs/project-configuration/vercel-json) — "`permanent`: An optional boolean to toggle between permanent and temporary redirect (default `true`). When `true`, the status code is 308. When `false` the status code is 307."
- The same page says `statusCode` "cannot be used with `permanent`."

The bulk-redirect field table on that same page disagrees:

- "`permanent`: Toggle between permanent (308) and temporary (307) redirect. Default: `false`."
- "`statusCode`: … Overrides permanent when set, otherwise defers to permanent value or default."

That bulk table describes `bulkRedirectsPath`, which this converter does not read. For a `redirects` entry we follow the redirects-object definition: omitted `permanent` means 308. That is the reading that preserves permanence. Using the bulk table's default of 307 would turn a permanent redirect into a temporary one.

When both `statusCode` and `permanent` are present we keep `statusCode`. The redirects object says not to combine them. The bulk table says `statusCode` wins. An explicit code is the operator's status, so we keep it instead of guessing from `permanent`.

`cleanUrls` and `trailingSlash` also use 308 on Vercel. See the behaviors section below. They are not written as `_redirects` lines.

### 200 rewrites

Netlify status 200 is a rewrite, not a redirect: [Rewrites and proxies](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/).

Cloudflare `_redirects` can proxy with 200 only to a relative URL on the same site: [Redirects — Proxying](https://developers.cloudflare.com/workers/static-assets/redirects/). The same page marks other rewrite statuses, including 404, as unsupported (`/blog/* /blog/404.html 404`).

A 200 rule is written only when the destination is a relative path and the pattern fits a splat or placeholder. An external 200, a 404, or any other status outside 301, 302, 303, 307, 308, and that relative 200, is `unsupported`. The alternative is a Worker.

## Patterns

Cloudflare allows one splat, and it has to be the last character of the source. The destination refers to it as `:splat`. Placeholders are `:name` and match a single path segment. [Splats and placeholders](https://developers.cloudflare.com/workers/static-assets/redirects/).

| Source form | Cloudflare |
| --- | --- |
| Netlify `*` in the source | `*` |
| Netlify `:splat` in the source | `*` |
| Netlify `:splat` in the destination | `:splat` |
| Vercel `:path*` (any `:name*`) in the source | `*` |
| Vercel `:path*` in the destination | `:splat` |
| Vercel source exactly `/(.*)` | `/*` |
| `:placeholder` | `:placeholder` |

`:name+`, regular expressions, more than one splat, and a splat that is not at the end of the source are `unsupported`. The alternative is a Worker.

Static rules are written before dynamic rules. Cloudflare asks for that order.

## What becomes `unsupported`

A rule is never dropped without a report entry. Each entry has a reason and one of Bulk Redirects, Redirect Rules, or a Worker. When several reasons apply, a Worker is suggested if any reason needs one, otherwise Redirect Rules, otherwise Bulk Redirects.

| Situation | Alternative |
| --- | --- |
| Query-parameter match (`id=:id`, `?id=`) | Redirect Rules |
| Country or language | Redirect Rules |
| Cookie | Redirect Rules |
| Vercel `has` / `missing` | Redirect Rules |
| Netlify role | Worker |
| Domain-level source (`https://old.example/*` or `old.example/*`) | Bulk Redirects |
| `force` / `!` when the behavior matches Cloudflare | written, not unsupported — see below |
| 404 and other non-redirect statuses | Worker |
| 200 to an external host | Worker |
| Signed proxy, or proxy request headers | Worker |
| `trailingSlash` and `cleanUrls` | Worker |
| `vercel.json` `routes` | Worker |

Cloudflare documents the same gaps: query parameters, domain-level redirects, country, language, and cookies are marked unsupported on the [redirects page](https://developers.cloudflare.com/workers/static-assets/redirects/).

### `force` and `!`

Netlify does not apply a rule when a file already exists unless the status carries `!` or `force = true`: [Force redirects](https://docs.netlify.com/manage/routing/redirects/redirect-options/).

Cloudflare says "Redirects are always followed, regardless of whether or not an asset matches the incoming request."

Two readings:

1. Cloudflare has no `!` token, so a forced rule cannot be copied and should be `unsupported`.
2. Cloudflare already always applies the redirect, which is what Netlify's `!` / `force = true` means, so the flag is redundant and the rule can be written.

We take the second reading. Dropping the rule would lose the redirect, including a permanent one. A forced rule is written with its explicit status and no caveat. An unforced Netlify rule, and a Vercel rewrite, is still written — the redirect itself fits — and the report carries a caveat that Cloudflare will also apply it when an asset exists. Vercel redirects are not given that caveat: Vercel evaluates redirects before the filesystem. The caveat is how the shadowing difference stays visible instead of being a silent behavior change.

## `trailingSlash` and `cleanUrls`

[vercel.json](https://vercel.com/docs/project-configuration/vercel-json):

- `trailingSlash: false` sends 308 from `/about/` to `/about`.
- `trailingSlash: true` sends 308 from `/about` to `/about/`, and does not add a slash to paths with a file extension.
- `cleanUrls: true` serves `about.html` at `/about` and redirects `/about.html` to `/about` with 308.

A `_redirects` splat cannot express either behavior without looping or rewriting CSS and other assets. Workers static-asset [`html_handling`](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/) covers similar HTML canonicalization, but its redirects are 307. 307 does not preserve the permanence of Vercel's 308, so the suggestion in the report is a Worker that can send 308. Both settings are `unsupported` whenever they are set. `trailingSlash` left unset and `cleanUrls: false` add no rule.

## Limits

[Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and the [redirects](https://developers.cloudflare.com/workers/static-assets/redirects/) and [headers](https://developers.cloudflare.com/workers/static-assets/headers/) pages:

| Limit | Value |
| --- | --- |
| Static redirects | 2,000 |
| Dynamic redirects | 100 |
| Characters per redirect rule | 1,000 |
| `_headers` rules | 100 |
| Characters per `_headers` line, including indentation | 2,000 |

A dynamic rule is one whose source or destination contains `*` or a `:placeholder`. `https://` does not count as a placeholder.

If a limit is exceeded the command exits 1, writes no `_redirects` or `_headers`, and prints a message that names Bulk Redirects. Header limits name Bulk Redirects for redirect overflow and a Worker for the header lines that do not fit. The JSON and Markdown reports still record `error` when `--json` or `--md` is set.

## Reports

`--source fixture|live` is required. The JSON summary has `source`. The Markdown file starts with `source: fixture` or `source: live`. Fixture output for the downgrade lives in `examples/convert-redirect-downgrade/`. Live runs stay in `evidence/live/`.
