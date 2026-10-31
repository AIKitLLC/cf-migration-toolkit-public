export const USAGE = `cfmt verify — compare an old origin with a new origin

Usage:
  cfmt verify --old <origin> --new <origin> --source fixture|live [sources] [options]

Required:
  --old <origin>           Old site origin, for example https://www.example.com
  --new <origin>           New site origin
  --source fixture|live    Report provenance. Required. Pass it once. No default.
                           live connects only to global unicast addresses.

URL sources (any mix):
  --urls <file>            Paths or absolute URLs, one per line
  --sitemap <url>          Sitemap or sitemap index
  --redirects <path>       Netlify _redirects file or netlify.toml
  --crawl <n>              Same-host BFS on the old origin, up to n pages

Redirect sources become one concrete URL per rule. :splat and * expand to the segment "sample".

Options:
  --json <file>            Write the JSON report
  --md <file>              Write the Markdown report
  --headers <list>         Comma-separated header allowlist (replaces the default).
                           set-cookie, authorization, cookie, proxy-authorization,
                           and x-api-key are rejected.
  --concurrency <n>        In-flight requests (default 4)
  --timeout <ms>           Per-request timeout (default 10000)
  --retries <n>            Retries after a network error (default 2)
  --user-agent <string>    Override the user agent
  --fail-on warn           Exit 1 when the report has warnings
  --fail-on-warn           Same as --fail-on warn. Takes no value.
  --help                   Show this help

Exit codes:
  0  no errors (warnings stay 0 unless --fail-on warn or --fail-on-warn)
  1  parity errors, or warnings when --fail-on warn or --fail-on-warn is set
  2  invalid arguments

A --json or --md path under evidence/live/ is written with a UTC timestamp in the file name (YYYYMMDDTHHMMSSZ) and is not overwritten in place. The write uses a temporary file in the same directory, then rename. Other report paths keep the requested name and use the same rename.

The JSON summary includes source. Fixture reports are labelled fixture and carry no evidence level. Live reports are labelled E2. The Markdown file starts with "source: fixture" or "source: live". A live report adds "evidence: E2" on the next line.
`;
