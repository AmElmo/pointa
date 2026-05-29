#!/usr/bin/env bash
set -euo pipefail

# Ensure shell starts in repository root when invoked from nested worktree paths.
root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$root"
repo_name="$(basename "$root")"
echo "worktree context set: <repo-root> ($repo_name)"
