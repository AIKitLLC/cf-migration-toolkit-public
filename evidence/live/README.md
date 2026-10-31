# Live evidence

Put verifier output from live runs in this folder.

Each run is produced with `--source live`. The JSON summary field `source` is `live` and `evidence` is `E2`. The Markdown file starts with `source: live` followed by `evidence: E2`. Fixture runs stay in `examples/`, use `--source fixture`, and carry no E-level. Keep the two trees separate.

Host and site identifiers in the committed copies were redacted after capture. The workers.dev host is written as `d1-netlify-static-faq.<subdomain>.workers.dev`. The Netlify site is written as `https://<site>.netlify.app`. Findings, counts, and check ids are otherwise unedited.

The D1 demo is one of the runs that belongs here. Do not hand-edit findings after `cfmt verify` writes them. A path under this folder is stored with a UTC stamp in the file name (`YYYYMMDDTHHMMSSZ`). The writer creates a temporary file in the same directory and renames it, so a later run does not replace an earlier one. The workers.dev procedure is `examples/d1-netlify-static-faq/GO-LIVE.md`. After maintainer approval, `scripts/d1/measure-rto.sh` writes `d1-netlify-static-faq-run-<stamp>.json`, `d1-rto-<stamp>.log`, and `d1-tail-event-<stamp>.json` here. The run file holds the date, the commit, the command, and the RTO samples. It is not verifier output. The tail event has `rayId`, `outcome`, `timestamp`, and `path`. The raw `d1-tail-*.log` is gitignored in this folder because `wrangler tail --format json` includes `cf-connecting-ip`. The verify command then writes its own stamped JSON and Markdown files. Those report files stay unedited apart from the host and site redaction above.

## Runs

- 2026-10-16, workers.dev rollback: [`d1-netlify-static-faq-run-20261016T231043Z.json`](d1-netlify-static-faq-run-20261016T231043Z.json), [`d1-rto-20261016T231043Z.log`](d1-rto-20261016T231043Z.log), [`d1-tail-event-20261016T231043Z.json`](d1-tail-event-20261016T231043Z.json). RTO median 2363.670 ms over three samples, from commit `76698e6` in the private development repo (history was squashed into the initial public release). `verifyCommand` is null on that run file.
- 2026-10-17, live verify: [`d1-netlify-static-faq-20261017T162419Z.json`](d1-netlify-static-faq-20261017T162419Z.json) and [`d1-netlify-static-faq-20261017T162419Z.md`](d1-netlify-static-faq-20261017T162419Z.md).
