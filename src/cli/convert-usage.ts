export const CONVERT_USAGE = `cfmt convert — write Cloudflare _redirects and _headers

Usage:
  cfmt convert --input <file> --out <dir> --source fixture|live [options]

Required:
  --input <file>           netlify.toml, _redirects, _headers, or vercel.json. Repeat to combine files. A directory is scanned for those names.
  --out <dir>              Directory for _redirects and _headers
  --source fixture|live    Report provenance. Required. No default.

Options:
  --json <file>            Write the JSON report
  --md <file>              Write the Markdown report
  --help                   Show this help

Every written redirect includes an explicit status code. Rules Cloudflare _redirects cannot express are listed as unsupported and are not dropped silently.

Exit codes:
  0  files written (unsupported rules stay in the report)
  1  Cloudflare's _redirects or _headers limits were exceeded
  2  invalid arguments

The JSON summary includes source. The Markdown file starts with "source: fixture" or "source: live".
`;

export const ROOT_USAGE = `cfmt — verify a migration and convert redirect rules

Usage:
  cfmt verify --old <origin> --new <origin> --source fixture|live [sources] [options]
  cfmt convert --input <file> --out <dir> --source fixture|live [options]

Run \`cfmt verify --help\` or \`cfmt convert --help\` for one command.

--source fixture|live is required for both commands. There is no default.
`;
