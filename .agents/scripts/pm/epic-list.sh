#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$root"

fm_get() {
  local file="$1"
  local key="$2"
  awk -v key="$key" '
    BEGIN {in_fm=0}
    /^---[[:space:]]*$/ {if (in_fm==0) {in_fm=1; next} else {exit}}
    in_fm==1 && $0 ~ "^" key ":[[:space:]]*" {
      sub("^" key ":[[:space:]]*", "")
      print
      exit
    }
  ' "$file"
}

found=0
for plan in .project/projects/*/plan.md; do
  [[ -f "$plan" ]] || continue
  slug="$(basename "$(dirname "$plan")")"
  name="$(fm_get "$plan" name 2>/dev/null || echo "$slug")"
  status="$(fm_get "$plan" status 2>/dev/null || echo "unknown")"
  lead="$(fm_get "$plan" lead 2>/dev/null || true)"
  echo "$slug\t$name\t$status\t$lead"
  found=1
done

if [[ $found -eq 0 ]]; then
  echo "No delivery plans found."
fi
