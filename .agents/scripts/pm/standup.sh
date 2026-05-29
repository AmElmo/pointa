#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$root"

echo "Daily standup snapshot ($(date -u +"%Y-%m-%dT%H:%M:%SZ"))"
echo ""

echo "[Portfolio]"
"$root/.agents/scripts/pm/status.sh"

echo ""
echo "[In Progress]"
"$root/.agents/scripts/pm/in-progress.sh"

echo ""
echo "[Blocked]"
"$root/.agents/scripts/pm/blocked.sh"
