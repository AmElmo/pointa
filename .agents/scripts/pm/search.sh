#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "" ]]; then
  echo "Usage: $0 <query>"
  exit 1
fi

query="$*"
root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$root"

grep -R -n -- "$query" .project/projects .project/context .project/registry || true
