#!/usr/bin/env bash
# Demo only: deploys a throwaway sandbox Worker to measure rollback time. Production deploys must run through CI (GitHub Actions), never from a local machine.
# Workers.dev rollback timing. Run only after maintainer approval.
# This script deploys. Do not run it while the pull request is still a draft.
# `bash scripts/d1/measure-rto.sh --check` stays on this machine and does not call Wrangler.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEMO="$ROOT/examples/d1-netlify-static-faq"
EVIDENCE="$ROOT/evidence/live"
OLD_URLS="$DEMO/old-urls.txt"
MARKER="site/dist/__version.txt"
MISSING_PATH="/__cfmt-missing"
INVOKE_PATH="/__cfmt-invoke"

elapsed_ms() {
  local start="$1" end="$2" delta
  delta=$((end - start))
  if ((delta < 0)); then
    echo "clock went backwards" >&2
    exit 1
  fi
  printf '%d.%03d' $((delta / 1000000)) $(((delta / 1000) % 1000))
}

median_of_three() {
  printf '%s\n' "$1" "$2" "$3" | sort -n | sed -n '2p'
}

atomic_write() {
  local dest="$1" tmp
  mkdir -p "$(dirname "$dest")"
  tmp="$(dirname "$dest")/.$(basename "$dest").$$.tmp"
  cat >"$tmp"
  mv -f "$tmp" "$dest"
}

require_gnu_date() {
  local now
  now="$(date +%s%N)"
  if [[ ! "$now" =~ ^[0-9]{19}$ ]]; then
    echo "date +%s%N must return nanoseconds from GNU date" >&2
    exit 1
  fi
}

# Header lookup is case-insensitive via grep -i. POSIX awk has no ignore-case flag.
header_value() {
  local file="$1" name="$2" line
  line="$(tr -d '\r' <"$file" | grep -i "^${name}:" | head -n 1 || true)"
  if [[ -z "$line" ]]; then
    return 0
  fi
  printf '%s\n' "$line" | cut -d: -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

require_header() {
  local file="$1" name="$2" want="$3" got
  got="$(header_value "$file" "$name")"
  if [[ "$got" != "$want" ]]; then
    echo "invoke ${name} is ${got:-absent}" >&2
    exit 1
  fi
}

has_noindex() {
  local value
  value="$(printf '%s' "$1" | tr 'A-Z' 'a-z' | tr -d '[:space:]')"
  case ",${value}," in
    *,noindex,*) return 0 ;;
    *) return 1 ;;
  esac
}

# A response cf-ray is the ray id plus a trailing hyphen and letters, for example
# a4baa744bd414f4c-SEA. wrangler tail --format json stores rayId without that suffix.
normalize_ray() {
  printf '%s' "$1" | sed -E 's/-[A-Za-z]+$//' | tr 'A-Z' 'a-z'
}

ray_in_file() {
  local ray="$1" file="$2" candidate
  ray="$(normalize_ray "$ray")"
  if [[ -z "$ray" || ! -f "$file" ]]; then
    return 1
  fi
  while IFS= read -r candidate; do
    if [[ "$(normalize_ray "$candidate")" == "$ray" ]]; then
      return 0
    fi
  done < <(grep -oE '"[^"]*"' "$file" | tr -d '"' || true)
  return 1
}

version_field() {
  printf 'v1=%s,v2=%s,current=%s' "${V1_ID:--}" "${V2_ID:--}" "${CURRENT_VERSION_ID:--}"
}

log_line() {
  local event="$1" path="$2" status="$3" ray="$4" hash="$5" ts
  ts="$(date -u +%Y-%m-%dT%H:%M:%S.%NZ)"
  printf '%s %s %s %s %s %s %s\n' \
    "$ts" "$event" "$path" "$status" "${ray:-none}" "${hash:--}" "$(version_field)" >>"$log"
}

if [[ "${1:-}" == "--check" ]]; then
  require_gnu_date
  start="$(date +%s%N)"
  end="$(date +%s%N)"
  elapsed_ms "$start" "$end" >/dev/null
  got="$(elapsed_ms 0 1500000)"
  if [[ "$got" != "1.500" ]]; then
    echo "elapsed_ms returned $got" >&2
    exit 1
  fi
  med="$(median_of_three 3.000 1.500 2.250)"
  if [[ "$med" != "2.250" ]]; then
    echo "median returned $med" >&2
    exit 1
  fi
  dir="$(mktemp -d)"
  trap 'rm -rf "$dir"' EXIT
  printf '%s\n' '{"ok":true}' | atomic_write "$dir/out.json"
  if [[ ! -f "$dir/out.json" ]]; then
    echo "atomic write missed the destination" >&2
    exit 1
  fi
  if compgen -G "$dir/.out.json.*.tmp" >/dev/null; then
    echo "atomic write left a temporary file" >&2
    exit 1
  fi
  printf '%s\n' 'CF-Ray: AbC-EWR' 'X-Robots-Tag: noindex' >"$dir/headers"
  got="$(header_value "$dir/headers" cf-ray)"
  if [[ "$got" != "AbC-EWR" ]]; then
    echo "cf-ray header lookup returned $got" >&2
    exit 1
  fi
  printf '%s\n' '{"rayId":"abc-ewr"}' >"$dir/tail.json"
  if ! ray_in_file 'AbC-EWR' "$dir/tail.json"; then
    echo "cf-ray file lookup missed a different case" >&2
    exit 1
  fi
  printf '%s\n' 'CF-Ray: a4baa744bd414f4c-SEA' >"$dir/headers-suffix"
  got="$(header_value "$dir/headers-suffix" cf-ray)"
  if [[ "$got" != "a4baa744bd414f4c-SEA" ]]; then
    echo "cf-ray header lookup returned $got" >&2
    exit 1
  fi
  printf '%s\n' '{"rayId":"a4baa744bd414f4c"}' >"$dir/tail-suffix.json"
  if ! ray_in_file "$got" "$dir/tail-suffix.json"; then
    echo "cf-ray file lookup missed a tail ray without the trailing hyphen and letters" >&2
    exit 1
  fi
  printf '%s\n' '{"rayId":"A4BAA744BD414F4C"}' >"$dir/tail-suffix-lower.json"
  if ! ray_in_file 'a4baa744bd414f4c-sea' "$dir/tail-suffix-lower.json"; then
    echo "cf-ray file lookup missed a lowercase header against an uppercase tail ray" >&2
    exit 1
  fi
  setsid sleep 30 &
  group_pid=$!
  sleep 0.2
  kill -- "-$group_pid" 2>/dev/null || true
  wait "$group_pid" 2>/dev/null || true
  if kill -0 "$group_pid" 2>/dev/null; then
    echo "setsid process group was still alive" >&2
    exit 1
  fi
  echo "measure-rto --check ok"
  exit 0
fi

if [[ "$#" -ne 0 ]]; then
  echo "usage: MERGED_SHA=<sha> bash scripts/d1/measure-rto.sh" >&2
  exit 2
fi

require_gnu_date
if [[ -z "${MERGED_SHA:-}" ]]; then
  echo "MERGED_SHA is required" >&2
  exit 2
fi
if [[ ! -d "$DEMO/site/dist" ]]; then
  echo "site/dist is missing. Run pnpm build:d1 from the repository root first." >&2
  exit 1
fi

export NO_COLOR=1
export FORCE_COLOR=0
export WRANGLER_SEND_METRICS=false

cd "$DEMO"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
log="$EVIDENCE/d1-rto-${stamp}.log"
tail_log="$EVIDENCE/d1-tail-${stamp}.log"
sidecar="$EVIDENCE/d1-netlify-static-faq-run-${stamp}.json"
if [[ -e "$log" || -e "$tail_log" || -e "$sidecar" ]]; then
  echo "refusing to overwrite $log" >&2
  exit 1
fi
mkdir -p "$EVIDENCE"
TAIL_PID=""

WRANGLER_BIN="$ROOT/node_modules/.bin/wrangler"

stop_tail() {
  if [[ -z "${TAIL_PID:-}" ]]; then
    return 0
  fi
  local pid="$TAIL_PID"
  TAIL_PID=""
  # setsid makes this pid the process group leader, so the wrangler child dies with it.
  kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
}

on_signal() {
  stop_tail
  exit 130
}

trap stop_tail EXIT
trap on_signal INT TERM HUP

start_tail() {
  if [[ ! -x "$WRANGLER_BIN" ]]; then
    echo "wrangler is not installed at $WRANGLER_BIN" >&2
    exit 1
  fi
  # --format json does not print a connection banner. wait_for_tail_nonce proves the session.
  setsid "$WRANGLER_BIN" tail --format json >"$tail_log" 2>&1 &
  TAIL_PID=$!
}

wait_for_tail_nonce() {
  local deadline now
  READY_NONCE="$(date +%s%N)-$$"
  deadline="$(($(date +%s) + 30))"
  while true; do
    curl -sS -o /dev/null --max-time 20 "${WORKERS_DEV_ORIGIN}${INVOKE_PATH}?ready=${READY_NONCE}" || true
    if [[ -f "$tail_log" ]] && grep -F -q -- "$READY_NONCE" "$tail_log"; then
      return 0
    fi
    if [[ -n "${TAIL_PID:-}" ]] && ! kill -0 "$TAIL_PID" 2>/dev/null; then
      echo "wrangler tail exited before the ready nonce appeared" >&2
      exit 1
    fi
    now="$(date +%s)"
    if ((now >= deadline)); then
      echo "tail did not show ready nonce within 30 seconds" >&2
      exit 1
    fi
    sleep 0.2
  done
}

wait_for_smoke_ray() {
  local deadline now
  deadline="$(($(date +%s) + 30))"
  while true; do
    if [[ -f "$tail_log" ]] && ray_in_file "$SMOKE_CF_RAY" "$tail_log"; then
      return 0
    fi
    now="$(date +%s)"
    if ((now >= deadline)); then
      echo "invoke cf-ray ${SMOKE_CF_RAY} was not in ${tail_log}" >&2
      exit 1
    fi
    sleep 0.2
  done
}

deploy_version() {
  local out
  out="$(npx wrangler deploy --message "$MERGED_SHA")"
  printf '%s\n' "$out"
  DEPLOYED_VERSION_ID="$(printf '%s\n' "$out" | sed -n 's/^Current Version ID:[[:space:]]*//p' | head -n 1)"
  if [[ -z "$DEPLOYED_VERSION_ID" ]]; then
    echo "deploy did not print Current Version ID" >&2
    exit 1
  fi
  local printed
  printed="$(printf '%s\n' "$out" | sed -n 's#.*\(https://[A-Za-z0-9.-]*\.workers\.dev\).*#\1#p' | head -n 1)"
  if [[ -z "$printed" ]]; then
    echo "deploy did not print a workers.dev URL" >&2
    exit 1
  fi
  if [[ -n "${WORKERS_DEV_ORIGIN:-}" && "$WORKERS_DEV_ORIGIN" != "$printed" ]]; then
    echo "WORKERS_DEV_ORIGIN does not match $printed" >&2
    exit 1
  fi
  WORKERS_DEV_ORIGIN="$printed"
}

http_status() {
  awk 'NR==1 { print $2 }' "$1" | tr -d '\r'
}

assert_noindex_url() {
  local path="$1" expect_status="${2:-}" hdr status tag ray
  hdr="$(mktemp)"
  curl -sS -D "$hdr" -o /dev/null --max-time 20 "${WORKERS_DEV_ORIGIN}${path}"
  status="$(http_status "$hdr")"
  tag="$(header_value "$hdr" x-robots-tag)"
  ray="$(header_value "$hdr" cf-ray)"
  rm -f "$hdr"
  log_line probe "$path" "$status" "$ray" -
  if ! has_noindex "$tag"; then
    echo "missing noindex on $path (status $status tag ${tag:-absent})" >&2
    exit 1
  fi
  if [[ -n "$expect_status" && "$status" != "$expect_status" ]]; then
    echo "$path status $status, expected $expect_status" >&2
    exit 1
  fi
}

assert_old_urls() {
  local line
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" ]] && continue
    assert_noindex_url "$line"
  done <"$OLD_URLS"
  assert_noindex_url "$MISSING_PATH" 404
}

write_marker() {
  printf '%s\n' "$1" >"$MARKER"
}

sample_rollback() {
  local start end deadline now hash tag ray ts hdr body status
  log_line rollback - - - -
  start="$(date +%s%N)"
  npx wrangler rollback "$V1_ID" --yes --message "$MERGED_SHA" >&2
  CURRENT_VERSION_ID="$V1_ID"
  deadline="$(($(date +%s) + 60))"
  while true; do
    hdr="$(mktemp)"
    body="$(mktemp)"
    curl -sS -D "$hdr" -o "$body" --max-time 20 "${WORKERS_DEV_ORIGIN}/__version.txt"
    hash="$(sha256sum "$body" | awk '{ print $1 }')"
    status="$(http_status "$hdr")"
    tag="$(header_value "$hdr" x-robots-tag)"
    ray="$(header_value "$hdr" cf-ray)"
    ts="$(date -u +%Y-%m-%dT%H:%M:%S.%NZ)"
    printf '%s probe /__version.txt %s %s %s %s\n' \
      "$ts" "$status" "${ray:-none}" "$hash" "$(version_field)" >>"$log"
    rm -f "$hdr" "$body"
    if [[ "$hash" == "$V1_HASH" ]] && has_noindex "$tag"; then
      break
    fi
    now="$(date +%s)"
    if ((now >= deadline)); then
      echo "rollback not visible within 60 seconds" >&2
      exit 1
    fi
    sleep 0.2
  done
  end="$(date +%s%N)"
  elapsed_ms "$start" "$end"
}

write_marker v1
V1_HASH="$(sha256sum "$MARKER" | awk '{ print $1 }')"
deploy_version
V1_ID="$DEPLOYED_VERSION_ID"
CURRENT_VERSION_ID="$V1_ID"
log_line deploy - - - -
start_tail
wait_for_tail_nonce

smoke_headers="$(mktemp)"
curl -sSI "${WORKERS_DEV_ORIGIN}/" | tr -d '\r' | tee "$smoke_headers" | grep -i '^x-robots-tag: noindex$'
HOME_STATUS="$(http_status "$smoke_headers")"
HOME_CF_RAY="$(header_value "$smoke_headers" cf-ray)"
rm -f "$smoke_headers"
if [[ -z "$HOME_CF_RAY" ]]; then
  echo "homepage response did not include cf-ray" >&2
  exit 1
fi
log_line probe / "$HOME_STATUS" "$HOME_CF_RAY" -

invoke_headers="$(mktemp)"
invoke_body="$(mktemp)"
curl -sS -D "$invoke_headers" -o "$invoke_body" --max-time 20 "${WORKERS_DEV_ORIGIN}${INVOKE_PATH}"
INVOKE_STATUS="$(http_status "$invoke_headers")"
INVOKE_TAG="$(header_value "$invoke_headers" x-robots-tag)"
SMOKE_CF_RAY="$(header_value "$invoke_headers" cf-ray)"
INVOKE_HASH="$(sha256sum "$invoke_body" | awk '{ print $1 }')"
log_line probe "$INVOKE_PATH" "$INVOKE_STATUS" "$SMOKE_CF_RAY" "$INVOKE_HASH"
if [[ "$INVOKE_STATUS" != "200" ]] || ! has_noindex "$INVOKE_TAG"; then
  echo "invoke path ${INVOKE_PATH} status ${INVOKE_STATUS} tag ${INVOKE_TAG:-absent}" >&2
  rm -f "$invoke_headers" "$invoke_body"
  exit 1
fi
if [[ -z "$SMOKE_CF_RAY" ]]; then
  echo "invoke response did not include cf-ray" >&2
  rm -f "$invoke_headers" "$invoke_body"
  exit 1
fi
require_header "$invoke_headers" cache-control 'public, max-age=0, must-revalidate'
require_header "$invoke_headers" x-frame-options 'DENY'
require_header "$invoke_headers" x-content-type-options 'nosniff'
require_header "$invoke_headers" referrer-policy 'no-referrer'
require_header "$invoke_headers" strict-transport-security 'max-age=31536000'
require_header "$invoke_headers" content-security-policy "default-src 'self'; style-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
require_header "$invoke_headers" x-robots-tag 'noindex'
rm -f "$invoke_headers" "$invoke_body"
wait_for_smoke_ray
if ray_in_file "$HOME_CF_RAY" "$tail_log"; then
  HOMEPAGE_IN_TAIL=true
else
  HOMEPAGE_IN_TAIL=false
  echo "WARN: static-asset homepage cf-ray ${HOME_CF_RAY} is not in the tail file. A pure static-asset request may not produce an invocation log. This is not an abort." >&2
fi
# The smoke ray is the log check. Rollback samples request static /__version.txt, so the tail stops here.
stop_tail
tail_event="$EVIDENCE/d1-tail-event-${stamp}.json"
pnpm --dir "$ROOT" exec tsx "$ROOT/scripts/d1/extract-tail-event.ts" \
  --tail "$tail_log" \
  --ray "$(normalize_ray "$SMOKE_CF_RAY")" \
  --out "$tail_event"
assert_old_urls

write_marker v2
deploy_version
V2_ID="$DEPLOYED_VERSION_ID"
CURRENT_VERSION_ID="$V2_ID"
log_line deploy - - - -

s1="$(sample_rollback)" || exit 1
write_marker v2
deploy_version
CURRENT_VERSION_ID="$DEPLOYED_VERSION_ID"
log_line deploy - - - -
s2="$(sample_rollback)" || exit 1
write_marker v2
deploy_version
CURRENT_VERSION_ID="$DEPLOYED_VERSION_ID"
log_line deploy - - - -
s3="$(sample_rollback)" || exit 1

median="$(median_of_three "$s1" "$s2" "$s3")"
for sample in "$s1" "$s2" "$s3" "$median"; do
  if [[ ! "$sample" =~ ^[0-9]+\.[0-9]{3}$ ]]; then
    echo "refusing to write a non-numeric sample: $sample" >&2
    exit 1
  fi
done

run_date="$(date -u +%F)"
run_sha="$(git -C "$ROOT" rev-parse HEAD)"
verify_command="null"
if [[ -n "${NETLIFY_FIXTURE_ORIGIN:-}" ]]; then
  verify_command="pnpm cfmt verify --old ${NETLIFY_FIXTURE_ORIGIN} --new ${WORKERS_DEV_ORIGIN} --source live --sitemap ${NETLIFY_FIXTURE_ORIGIN}/sitemap.xml --urls examples/d1-netlify-static-faq/old-urls.txt --redirects examples/d1-netlify-static-faq/site/netlify.toml --fail-on-warn --json evidence/live/d1-netlify-static-faq.json --md evidence/live/d1-netlify-static-faq.md"
fi
for value in "$run_date" "$run_sha" "$MERGED_SHA" "$WORKERS_DEV_ORIGIN" "$SMOKE_CF_RAY" "$HOME_CF_RAY" "$V1_ID" "$V2_ID" "${NETLIFY_FIXTURE_ORIGIN:-}"; do
  if [[ "$value" == *\"* || "$value" == *\\* || "$value" == *$'\n'* ]]; then
    echo "refusing a sidecar value that is not safe in JSON" >&2
    exit 1
  fi
done
log_rel="evidence/live/d1-rto-${stamp}.log"
event_rel="evidence/live/d1-tail-event-${stamp}.json"
{
  printf '{\n'
  printf '  "date": "%s",\n' "$run_date"
  printf '  "commit": "%s",\n' "$run_sha"
  printf '  "mergedSha": "%s",\n' "$MERGED_SHA"
  printf '  "workersDevOrigin": "%s",\n' "$WORKERS_DEV_ORIGIN"
  if [[ "$verify_command" == "null" ]]; then
    printf '  "verifyCommand": null,\n'
  else
    printf '  "verifyCommand": "%s",\n' "$verify_command"
  fi
  printf '  "smokeCfRay": "%s",\n' "$SMOKE_CF_RAY"
  printf '  "homepageCfRay": "%s",\n' "$HOME_CF_RAY"
  printf '  "invokePath": "%s",\n' "$INVOKE_PATH"
  printf '  "homepageInTail": %s,\n' "$HOMEPAGE_IN_TAIL"
  printf '  "staticAssetInvocationLog": "warn-if-missing",\n'
  printf '  "tailEvent": "%s",\n' "$event_rel"
  printf '  "tailLog": "gitignored",\n'
  printf '  "marker": "/__version.txt",\n'
  printf '  "v1VersionId": "%s",\n' "$V1_ID"
  printf '  "v2VersionId": "%s",\n' "$V2_ID"
  printf '  "rollback": {\n'
  printf '    "elapsedMs": %s,\n' "$median"
  printf '    "method": "wrangler rollback",\n'
  printf '    "replaces": "simulated-local"\n'
  printf '  },\n'
  printf '  "rto": {\n'
  printf '    "samplesMs": [%s, %s, %s],\n' "$s1" "$s2" "$s3"
  printf '    "medianMs": %s,\n' "$median"
  printf '    "elapsedMs": %s,\n' "$median"
  printf '    "measuredBy": "maintainer",\n'
  printf '    "from": "wrangler rollback",\n'
  printf '    "until": "curl returns the previous version",\n'
  printf '    "log": "%s"\n' "$log_rel"
  printf '  }\n'
  printf '}\n'
} | atomic_write "$sidecar"

printf 'rto median %s ms\n' "$median"
printf 'sidecar %s\n' "$sidecar"
printf 'log %s\n' "$log"
printf 'tail event %s\n' "$tail_event"
printf 'tail log (gitignored) %s\n' "$tail_log"
printf 'smoke cf-ray %s\n' "$SMOKE_CF_RAY"
