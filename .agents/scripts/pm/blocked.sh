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
for task in .project/projects/*/tasks/*.md; do
  [[ -f "$task" ]] || continue
  status="$(fm_get "$task" status 2>/dev/null || true)"
  [[ "$status" == "blocked" ]] || continue

  project="$(basename "$(dirname "$(dirname "$task")")")"
  tid="$(fm_get "$task" id 2>/dev/null || basename "$task" .md)"
  name="$(fm_get "$task" name 2>/dev/null || basename "$task" .md)"
  echo "$project\t$tid\t$name\t$task"
  found=1
done

if [[ $found -eq 0 ]]; then
  echo "No blocked tasks."
fi
