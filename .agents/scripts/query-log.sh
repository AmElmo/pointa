#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$root"

type_filter=""
actor_filter=""
since_filter=""
last_n=""
pretty=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type) type_filter="$2"; shift 2 ;;
    --actor) actor_filter="$2"; shift 2 ;;
    --since) since_filter="$2"; shift 2 ;;
    --last) last_n="$2"; shift 2 ;;
    --pretty) pretty=true; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

LOG_FILE=".agents/logs/changes.jsonl"
[[ -f "$LOG_FILE" ]] || { echo "No log file: $LOG_FILE"; exit 0; }

node - "$LOG_FILE" "$type_filter" "$actor_filter" "$since_filter" "$last_n" "$pretty" <<'NODE'
const fs = require('fs');

const [logFile, typeFilter, actorFilter, sinceFilter, lastNRaw, prettyRaw] = process.argv.slice(2);
const pretty = prettyRaw === 'true';
const lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean);
const parsed = [];
for (const line of lines) {
  try { parsed.push(JSON.parse(line)); } catch {}
}

let out = parsed.filter(e => {
  if (typeFilter && e.type !== typeFilter) return false;
  if (actorFilter && e.actor !== actorFilter) return false;
  if (sinceFilter && (e.timestamp || '') < sinceFilter) return false;
  return true;
});

const lastN = Number(lastNRaw || 0);
if (Number.isFinite(lastN) && lastN > 0) {
  out = out.slice(-lastN);
}

for (const row of out) {
  if (pretty) {
    console.log(JSON.stringify(row, null, 2));
  } else {
    console.log(JSON.stringify(row));
  }
}
NODE
