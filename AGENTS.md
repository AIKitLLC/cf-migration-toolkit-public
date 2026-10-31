# Agents

This repo is the Cloudflare migration toolkit. `cfmt verify` compares origins. `cfmt convert` writes Cloudflare `_redirects` and `_headers`. Read `docs/ARCHITECTURE.md` and `docs/CONVERTER.md` before changing behavior.

## Commands

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm cfmt verify --help
pnpm cfmt convert --help
pnpm generate:evidence
pnpm build:d1
pnpm verify:d1
pnpm rollback:d1
```

`pnpm generate:evidence` rewrites `examples/redirect-downgrade/` and `examples/convert-redirect-downgrade/`. Do not hand-edit those reports. If a comparator or converter change alters them, regenerate and commit the new files.

`pnpm verify:d1` rewrites `examples/d1-netlify-static-faq/parity/`. `pnpm rollback:d1` rewrites `examples/d1-netlify-static-faq/rollback/`. `pnpm build:d1` rewrites `examples/d1-netlify-static-faq/conversion/`. Do not hand-edit those files. Tests call the same functions with a temp directory and must not rewrite the committed copies. The rollback label is `simulated-local`. Do not run `scripts/d1/measure-rto.sh`; it deploys.

## Rules that are easy to break

- `--source fixture|live` is required. Do not give it a default. Pass it once. Fixture evidence uses `fixture` and has no evidence level. Live runs use `live`, are labelled `E2`, and belong in `evidence/live/`. Host and site identifiers may be redacted after capture; findings stay unedited. A live connection is allowed only when every resolved address is global unicast, and that check runs on every connection.
- Do not publish to npm and do not deploy.
- Tests must not call real third-party hosts. Use `127.0.0.1` or an in-memory `PageReader`.
- Keep `url-sources`, `fetcher`, `comparators`, `reporters`, `convert`, and `cli` decoupled. `cfmt convert` reuses `src/redirects` and must not import the fetcher or the comparators.
- A redirect rule with no status is the Netlify 301 / Cloudflare 302 downgrade. `redirect-status-changed` is an error when 301/308 becomes 302, 303, or 307, and when a redirect appears or disappears.
- CI is `.github/workflows/ci.yml`: `permissions: contents: read`, `timeout-minutes: 20`, checkout `persist-credentials: false`, and the checkout, pnpm, and setup-node actions pinned by commit SHA.

## Where to edit

| Change | Place |
| --- | --- |
| A new check | A new `Comparator` in `src/comparators/`, registered in `createComparators` |
| A new URL source | A new `UrlSource`, wired in `src/cli/collect-paths.ts` |
| Report shape | `src/reporters/` and `src/domain/build-report.ts` |
| Redirect syntax | `src/redirects/` |
| The local 301-vs-302 servers | `src/demo/` |
