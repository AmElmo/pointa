#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$root"

matches_file="$(mktemp)"
trap 'rm -f "$matches_file"' EXIT

compat_paths=()
if [[ -e .claude || -L .claude ]]; then
  compat_paths+=(.claude)
fi

if find .project .agents "${compat_paths[@]}" \
  -type f \
  \( -name '*.md' -o -name '*.json' -o -name '*.yaml' -o -name '*.yml' \) \
  -not -path '.agents/logs/*' \
  -not -path '.claude/logs/*' \
  -print0 | xargs -0 grep -nE '(/home/[^[:space:]]+|/Users/[^[:space:]]+|/mnt/[A-Za-z]/[^[:space:]]+|[A-Za-z]:\\[^[:space:]]+)' > "$matches_file" 2>/dev/null; then
  echo "Absolute path violations found:"
  cat "$matches_file"
  exit 1
fi

echo "Path standards check passed."
