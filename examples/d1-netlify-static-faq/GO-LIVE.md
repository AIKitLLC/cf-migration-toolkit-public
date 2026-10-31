# Workers.dev go-live

[DEMO](https://www.merriam-webster.com/dictionary/demo): fictional product / sample site, not a real company.

Run this runbook only after maintainer approval. The fixture did not deploy, did not call Cloudflare, and did not read or write a secret. `scripts/d1/measure-rto.sh` is the only deploy and the only [RTO](https://csrc.nist.gov/glossary/term/recovery_time_objective) measurement. Do not run it before that approval.

The site is a [FAQ](https://www.irs.gov/faqs) on a fictional sample desk.

## 1. Pre-flight

Stop without maintainer approval. The person who runs the measurement stays with the procedure until the script writes the three samples.

From the repository root, on a clean checkout of the commit you intend to deploy:

```bash
git status --short
git rev-parse HEAD
date -u +%F
pnpm install
pnpm build:d1
pnpm verify:d1
bash scripts/d1/measure-rto.sh --check
```

`pnpm verify:d1` stays on this machine. It uses `--source fixture`. It must exit 0. It also checks that every path in `old-urls.txt`, and `/__cfmt-missing`, returns `x-robots-tag` containing `noindex`. The missing path must be [HTTP](https://developer.mozilla.org/en-US/docs/Glossary/HTTP) 404. Do not treat that fixture report as evidence level [E2](../../docs/ARCHITECTURE.md).

`--check` proves the timing script's clock, median, and `cf-ray` match on this machine. It does not call Wrangler.

The build must publish both noindex controls, and the Worker config must turn on invocation logs and traces:

```bash
grep -F 'X-Robots-Tag: noindex' examples/d1-netlify-static-faq/site/dist/_headers
grep -F 'Disallow: /' examples/d1-netlify-static-faq/site/dist/robots.txt
grep -F '"workers_dev": true' examples/d1-netlify-static-faq/wrangler.jsonc
grep -F '"preview_urls": false' examples/d1-netlify-static-faq/wrangler.jsonc
grep -F '"invocation_logs": true' examples/d1-netlify-static-faq/wrangler.jsonc
grep -F '"traces"' examples/d1-netlify-static-faq/wrangler.jsonc
```

`observability.enabled`, `observability.logs.enabled`, `observability.logs.invocation_logs`, and `observability.traces.enabled` must be true.

`wrangler.jsonc` must not contain a route or a custom domain. This search must print nothing:

```bash
grep -E '"routes"|"route"|"domain"' examples/d1-netlify-static-faq/wrangler.jsonc
```

Confirm the tree has no secret file and that the shell you will use does not point Wrangler at a secrets file:

```bash
test ! -e examples/d1-netlify-static-faq/.dev.vars
test ! -e examples/d1-netlify-static-faq/.env
git status --short
```

`git status --short` must stay empty. Do not create an [API](https://developer.mozilla.org/en-US/docs/Glossary/API) token, do not write one into the shell history of this repo, and do not pass `--secrets-file` or `--env-file`.

After maintainer approval, and only then, confirm the logged-in account. This command talks to Cloudflare:

```bash
pnpm exec wrangler whoami
```

Abort if that account is the wrong one.

`NETLIFY_FIXTURE_ORIGIN` is the public origin of the Netlify-style fixture: the same pages, `sitemap.xml`, `robots.txt`, and `netlify.toml` behavior as the local simulator. The simulator listens on `http://127.0.0.1:41751`. `--source live` rejects that address, and every other address that is not global unicast, including on [DNS](https://developer.mozilla.org/en-US/docs/Glossary/DNS) answers used by redirect hops and the sitemap fetch. Do not create a Netlify account to manufacture this origin. If you do not already have a public fixture origin, abort section 3. You can still run section 2. The script records `verifyCommand` as null until this origin is set.

```bash
export MERGED_SHA="$(git rev-parse HEAD)"
export NETLIFY_FIXTURE_ORIGIN='https://<public-fixture-host>'
```

`MERGED_SHA` is the full commit being deployed. `NETLIFY_FIXTURE_ORIGIN` must be an `https` [URL](https://developer.mozilla.org/en-US/docs/Glossary/URL). It must not be `127.0.0.1`, `localhost`, or a private address. Leave `WORKERS_DEV_ORIGIN` unset. The script reads the workers.dev URL from the first deploy and refuses a pre-set value that does not match it. Neither value may contain a double quote or a backslash, because the sidecar stores them in [JSON](https://developer.mozilla.org/en-US/docs/Glossary/JSON).

## 2. Deploy and measure

Deploy by hand, from the maintainer's machine, with the script below. Do not use Workers Builds. Workers Builds is not connected for this Worker. A merge does not deploy the Worker.

The order inside the script is fixed. Deploy v1 first. Then secrets (none). Then routes (none). Then deploy v2. Then roll back. Never run `wrangler secret put` before the first deploy, and do not run it after either. D1 has no secrets and no routes.

`/robots.txt` is the same in v1 and v2, so a hash of that file cannot show a rollback. The script writes `site/dist/__version.txt` (gitignored, not an Astro source file) as `v1` and deploys it, then writes `v2` and deploys that. Each deploy is `npx wrangler deploy --message "$MERGED_SHA"` from `examples/d1-netlify-static-faq`. The script does not pass `--routes`, `--route`, `--domains`, `--domain`, `--secrets-file`, or `--env-file`.

Right after the v1 deploy, the script starts `setsid node_modules/.bin/wrangler tail --format json` and writes it to `evidence/live/d1-tail-<stamp>.log`. That binary is the process-group leader. `--format json` does not print a connection banner, so the script does not wait for one. It loops `GET /__cfmt-invoke?ready=<nonce>` until that nonce is in the tail file, with a 30 second deadline. The tail is already receiving before the homepage curl and before the real smoke request. It stops as soon as the smoke `cf-ray` matches a ray in the file. The match removes a trailing hyphen and letters from both values and ignores letter case. That stop is before the three rollback samples. Those samples request static `/__version.txt` and do not need the tail. Do not start `wrangler tail` only after the script exits. A tail started then shows only new requests, so the smoke `cf-ray` is already gone and a match against that late tail always fails. The raw tail file includes `cf-connecting-ip`. `evidence/live/.gitignore` excludes `d1-tail-*.log`. Commit `evidence/live/d1-tail-event-<stamp>.json` instead. That file has `rayId`, `outcome`, `timestamp`, and `path`.

The homepage check is still this command, on the response from that curl:

```bash
curl -sSI "https://d1-netlify-static-faq.<subdomain>.workers.dev/" | tr -d '\r' | grep -i '^x-robots-tag: noindex$'
```

`<subdomain>` is the host the deploy printed. `/` is a static asset. A static-asset request may not produce an invocation log. If the homepage `cf-ray` has no matching ray in the tail file after removal of a trailing hyphen and letters, the script prints a warning and continues. That warning is not an abort.

The log check is a different request: `GET /__cfmt-invoke` with no query, after the ready nonce has appeared. `wrangler.jsonc` sets `assets.run_worker_first` to that path only, so the User Worker in `src/invoke.js` handles it and the request produces an invocation log. That response carries the same security headers as the converted `/*` rule in `_headers`, including `x-robots-tag: noindex`. The script reads `cf-ray` and those headers from that one response and requires a matching ray in the tail file. It removes a trailing hyphen and letters from the response header and from the tail ray, then compares the two without regard to letter case. The homepage check and the extracted tail event use that same ray. A missing invoke ray aborts the run. Other paths stay on the asset worker.

The script then requests every path in `old-urls.txt`, and `/__cfmt-missing`. Each response must include `noindex`. `/__cfmt-missing` must be 404. Those are static-asset responses. A missing invocation log for them is the same warning, not an abort.

Workers Logs are also stored. `observability.logs.persist` defaults to true, so the Cloudflare dashboard can show the same invoke ray later. That dashboard query is a second look. It does not replace the tail file, and it is not a `wrangler tail` started after the script.

From the repository root, after section 1:

```bash
bash scripts/d1/measure-rto.sh
```

The script then rolls back to the v1 version id three times. Between sample 1 and sample 2, and between sample 2 and sample 3, it redeploys v2. It does not redeploy after the third sample. Each rollback is:

```bash
npx wrangler rollback "$V1_ID" --yes --message "$MERGED_SHA"
```

The clock is `date +%s%N` in that one script. It starts when `wrangler rollback` is issued and stops when one curl of `/__version.txt` returns the v1 body hash and `x-robots-tag` containing `noindex`. The hash and the header come from that same response. Each probe appends one line to `evidence/live/d1-rto-<stamp>.log`: UTC timestamp, event, path, HTTP status, `cf-ray`, SHA-256 or `-`, and `v1=<id>,v2=<id>,current=<id>`. Wrangler 4 prints `Current Version ID` and does not print a separate deployment id. The stamp is [UTC](https://www.nist.gov/pml/time-and-frequency-division/time-realization/utcnist-time-scale). The hash is [SHA-256](https://csrc.nist.gov/glossary/term/secure_hash_algorithm). Header names are matched with `grep -i`, not gawk. The deadline is 60 seconds, read with `date +%s`. The script writes `rto.samplesMs`, `rto.medianMs`, and `rto.elapsedMs` (the median) into `evidence/live/d1-netlify-static-faq-run-<stamp>.json` with a temporary file and `mv`. Do not type a millisecond value. Do not copy the `simulated-local` number. `rto.measuredBy` is `operator`.

Copy the printed workers.dev URL, the smoke `cf-ray`, the sidecar path, and the log path into the notes for section 4.

## 3. Live verify

Write the unedited E2 report under `evidence/live/`. `cfmt verify` labels a live run `source: live` and `evidence: E2`. A path under `evidence/live/` receives a UTC stamp `YYYYMMDDTHHMMSSZ` in the file name. The write goes to a temporary file in that directory, then `rename`, so a second run does not overwrite the first. stderr prints `wrote <path>` for the JSON file and again for the Markdown file. Those printed paths are the evidence. Do not copy them onto `d1-netlify-static-faq.json`.

Run the `verifyCommand` from the sidecar when it is not null. It is this command with the origins expanded:

```bash
pnpm cfmt verify \
  --old "$NETLIFY_FIXTURE_ORIGIN" \
  --new "$WORKERS_DEV_ORIGIN" \
  --source live \
  --sitemap "$NETLIFY_FIXTURE_ORIGIN/sitemap.xml" \
  --urls examples/d1-netlify-static-faq/old-urls.txt \
  --redirects examples/d1-netlify-static-faq/site/netlify.toml \
  --fail-on-warn \
  --json evidence/live/d1-netlify-static-faq.json \
  --md evidence/live/d1-netlify-static-faq.md
```

Do not point `--old` at `127.0.0.1`. The JSON report must have `summary.source` of `live` and `summary.evidence` of `E2`. The Markdown report must start with `source: live` and the next line must be `evidence: E2`. Exit code 0 means no parity errors. A warning is an abort (section 5) because `--fail-on-warn` is set.

The sidecar from section 2 already holds the UTC date, the full commit, the expanded verify command, and the RTO. It is not verifier output. Do not edit it to fill in a time.

## 4. Logs

Confirm the invoke request. The script already started `wrangler tail --format json` before `GET /__cfmt-invoke` and stopped it when `smokeCfRay` appeared in the tail file, before the rollback samples. `tailEvent` in the sidecar is `evidence/live/d1-tail-event-<stamp>.json`. `tailLog` is `gitignored`. The fixture did not run the tail. A tail started only after the script exits is not this check.

`homepageCfRay` is the static-asset homepage. `staticAssetInvocationLog` is `warn-if-missing`. Absence of that ray from the tail file is a warning. It is not an abort.

## 5. Abort

Stop and do not continue when any of these are true:

- Maintainer approval has not been given.
- The deploy is Workers Builds, or a merge would deploy the Worker by itself. Builds is not connected, and a merge does not deploy.
- The checkout is dirty, or it is not the commit you recorded.
- `pnpm verify:d1` exits non-zero, or the fixture report has an error or a warning.
- `site/dist/_headers` lacks `X-Robots-Tag: noindex`, or `site/dist/robots.txt` lacks `Disallow: /`.
- The config names a route, a custom domain, or a secrets file, `workers_dev` is not true, invocation logs are off, or traces are off.
- `wrangler secret put` runs. D1 has no secrets.
- `wrangler whoami` is the wrong account, or a token would have to be created or committed.
- The deploy is not the script's `npx wrangler deploy --message <merged sha>`, or it passes `--routes`, `--domains`, `--secrets-file`, or `--env-file`.
- The printed hostname is not a `workers.dev` host.
- The smoke [GET](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/GET) lacks `x-robots-tag: noindex`, a path in `old-urls.txt` lacks `noindex`, or `/__cfmt-missing` is not a 404 with `noindex`.
- `/robots.txt` lacks `Disallow: /`.
- Either verify origin is loopback, private, or otherwise not global unicast.
- There is no public Netlify fixture origin. Do not retarget `--old` at the workers.dev host, and do not rerun the command as `--source fixture` and call it E2.
- `cfmt verify --source live` exits non-zero, or the report is missing `evidence: E2`.
- Someone would type a millisecond value, or would time the rollback with `python3` `perf_counter`. The script's three samples and their median are the RTO. Do not copy `simulated-local`.
- A rollback poll lasts longer than 60 seconds.
- `smokeCfRay` from `GET /__cfmt-invoke` does not appear in the tail file the script started before that request.
- Someone starts `wrangler tail` only after the script exits and treats that empty tail as the log check.

`wrangler delete` needs explicit approval. Do not run it as a substitute for the three rollbacks, and do not run it because the first deploy has no previous version. The script creates v1 and v2 so a previous version exists. A delete is not the rollback RTO. If that approval is given, and the site must come off workers.dev, time that delete with `date +%s%N` from the delete command until the first GET that is not HTTP 200. Record `rollback.method` as `wrangler delete`. Leave `rto.medianMs` as the script wrote it.

```bash
# Maintainer approval is required before the next command. This is not the rollback RTO.
start=$(date +%s%N)
pnpm exec wrangler delete d1-netlify-static-faq \
  --config examples/d1-netlify-static-faq/wrangler.jsonc \
  --force
deadline=$(($(date +%s) + 60))
while true; do
  status=$(curl -sS -o /dev/null -w '%{http_code}' "$WORKERS_DEV_ORIGIN/" || true)
  if [[ "$status" != "200" ]]; then
    break
  fi
  if (( $(date +%s) >= deadline )); then
    echo "delete not visible within 60 seconds" >&2
    exit 1
  fi
  sleep 0.2
done
end=$(date +%s%N)
delta=$((end - start))
printf '%d.%03d\n' $((delta / 1000000)) $(((delta / 1000) % 1000))
```

`--force` is only for this abort, so the prompt is not part of the timed wait. The printed number is the delete time. It does not replace `rto.medianMs`.

## 6. After the run

- The JSON and Markdown paths are the `wrote` lines from section 3. They were not edited, and they were not copied over an older file.
- The Markdown file starts with `source: live` and then `evidence: E2`. The JSON summary has `"source": "live"` and `"evidence": "E2"`.
- `evidence/live/d1-netlify-static-faq-run-<stamp>.json` was written by `scripts/d1/measure-rto.sh`. It has the UTC date, the full commit, the expanded verify command, `rto.samplesMs`, and `rto.medianMs`.
- `rto.medianMs` is the rollback RTO: the median of three live samples, each from `wrangler rollback` until curl returned v1. It is not the `simulated-local` value.
- `evidence/live/d1-rto-<stamp>.log` has one line per probe, with HTTP status and `v1`, `v2`, and `current` version ids, written by the script.
- `evidence/live/d1-tail-event-<stamp>.json` is the extracted tail event (`rayId`, `outcome`, `timestamp`, `path`). The raw `d1-tail-<stamp>.log` stayed on the machine that ran the script and was not committed. `smokeCfRay` is the response `cf-ray`. It matches `rayId` in the extracted event once a trailing hyphen and letters are removed and letter case is ignored.
- A missing tail line for the homepage or another static asset was recorded as a warning, not an abort.
- The live URL is still a workers.dev host, on v1, with `x-robots-tag: noindex` and `Disallow: /`.
- No token, `.dev.vars`, or `.env` was added to the commit.
- `examples/d1-netlify-static-faq/rollback/simulated-local.json` still has the label `simulated-local`.

## 7. Live run record (2026-10-16)

- Commit: `76698e6c32240c8ba56f2412ec651e38c62e7893`. Run window: 2026-10-16 23:10:43–23:11:20 [UTC](https://www.nist.gov/pml/time-and-frequency-division/time-realization/utcnist-time-scale).
- URL: https://d1-netlify-static-faq.<subdomain>.workers.dev (workers.dev only, no route, no custom domain).
- Rollback target and current version (v1): `f7eaaf77-1d69-41ac-b915-0f6987bb515b`. v2: `1eb9271f-e734-4a5c-919a-5b8feff1e5af`.
- RTO samples, each from `wrangler rollback` until curl returned v1: 2363.670 ms, 2194.162 ms, 2489.879 ms. Median: **2363.670 ms**. All three are under the 60-second limit.
- `x-robots-tag: noindex` was present on `/` and on the 404 `/__cfmt-missing`.
- Evidence: `evidence/live/d1-netlify-static-faq-run-20261016T231043Z.json`, `evidence/live/d1-rto-20261016T231043Z.log`, `evidence/live/d1-tail-event-20261016T231043Z.json`. The raw tail log stays gitignored.
