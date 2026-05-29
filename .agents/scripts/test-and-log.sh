#!/usr/bin/env bash
set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <test-command...>"
  exit 1
fi

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$root"

mkdir -p .agents/logs/tests
run_id="$(date -u +"%Y%m%dT%H%M%SZ")"
log_file=".agents/logs/tests/$run_id.log"

set +e
"$@" 2>&1 | tee "$log_file"
exit_code=${PIPESTATUS[0]}
set -e

timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
printf '{"timestamp":"%s","command":"%s","exit_code":%s,"log_file":"%s"}\n' \
  "$timestamp" "$*" "$exit_code" "$log_file" >> .agents/logs/test-runs.jsonl

.agents/scripts/log-event.sh test_run system --command "$*" --exit "$exit_code" --log "$log_file" >/dev/null || true

echo "Saved test log: $log_file"
exit $exit_code
