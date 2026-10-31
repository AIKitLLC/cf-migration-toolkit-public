# D1 runbook

DEMO: fictional product / sample site, not a real company.

Do not deploy, do not create a Netlify or Cloudflare account, and do not put secrets in this directory. The workers.dev commands live in `GO-LIVE.md` and run only after maintainer approval. They were not run for this fixture.

## Local build and parity

From the repository root:

```bash
pnpm install
pnpm build:d1
pnpm verify:d1
```

`pnpm verify:d1` starts the Netlify-style simulator on `127.0.0.1:41751` and `wrangler dev --local` on `127.0.0.1:41752`, then runs:

```bash
pnpm cfmt verify \
  --old http://127.0.0.1:41751 \
  --new http://127.0.0.1:41752 \
  --source fixture \
  --sitemap http://127.0.0.1:41751/sitemap.xml \
  --urls examples/d1-netlify-static-faq/old-urls.txt \
  --redirects examples/d1-netlify-static-faq/site/netlify.toml \
  --json examples/d1-netlify-static-faq/parity/report.json \
  --md examples/d1-netlify-static-faq/parity/report.md
```

The report is labelled `fixture` and has no evidence level. Exit code 0 means no parity errors. Warnings also fail the demo test. Regenerate the report with `pnpm verify:d1`. Do not hand-edit it.

## Deploy and workers.dev rollback

Do not use the commands in this file to deploy. The workers.dev procedure is `GO-LIVE.md`. Run that file only after maintainer approval. The deploy and the timing are `scripts/d1/measure-rto.sh`: v1 and v2 marker files, then three rollbacks, with the median written by the script. Workers Builds is not connected, and a merge does not deploy. Secrets come after that deploy, and D1 has none. Routes come last, and there are none: workers.dev only. The script starts `wrangler tail` before `GET /__cfmt-invoke`, proves it with a ready nonce, stops it when the smoke ray is in the file, and treats a missing log for a static asset as a warning. The raw tail log is gitignored. `wrangler delete` needs maintainer approval. This fixture did not run `GO-LIVE.md`.

## simulated-local

The local timing is labelled `simulated-local` everywhere: this runbook, `rollback/simulated-local.json`, and `rollback/simulated-local.md`.

`pnpm rollback:d1` builds two copies of the demo assets, starts each under `wrangler dev --local`, and points a local switch at v2. The timer starts when the switch is moved to v1 and stops when `/version.txt` returns `v1`. The recorded `simulated-local` timing is 5.698 ms, in `rollback/simulated-local.json` and `rollback/simulated-local.md`. It is not a workers.dev timing.

The workers.dev rollback timing is the procedure in `GO-LIVE.md`, and it runs only after maintainer approval. Do not invent that number, and do not copy 5.698 into the live report.

## Form

The form `sample-question` is unsupported. See `conversion/form-unsupported.json`. Locally, a submission to the simulator is discarded. On Workers Static Assets there is no Netlify form handler. `GET /form-stub` is the static stub.

## Exit

The fixture stops at the local parity report and the `simulated-local` timing. The workers.dev measurement is `GO-LIVE.md`.
