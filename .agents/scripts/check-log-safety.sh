#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$root"

errors=0

require_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    echo "✅ $file"
  else
    echo "❌ Missing log-safety file: $file"
    errors=$((errors + 1))
  fi
}

echo "Log safety check"
echo "================"

require_file ".agents/common/log-safety.js"
require_file ".agents/hooks/user-prompt-logger.js"
require_file ".agents/logs/schema.md"

if [[ -e .claude || -L .claude ]]; then
  require_file ".claude/common/log-safety.js"
fi

if grep -q 'prompt_hash' .agents/hooks/user-prompt-logger.js && grep -q 'DELANO_LOG_RAW_PROMPTS' .agents/hooks/user-prompt-logger.js; then
  echo "✅ Prompt logger stores hash metadata by default and gates raw text"
else
  echo "❌ Prompt logger must store prompt_hash and gate raw text behind DELANO_LOG_RAW_PROMPTS"
  errors=$((errors + 1))
fi

if grep -q 'redactObject' .agents/hooks/post-tool-logger.js && grep -q 'redactObject' .agents/scripts/log-event.js; then
  echo "✅ Change/event metadata passes through redaction helpers"
else
  echo "❌ Change/event logging must redact metadata before write"
  errors=$((errors + 1))
fi

raw_schema_matches="$(grep -RIn '"prompt"[[:space:]]*:[[:space:]]*"string"' .agents .claude 2>/dev/null || true)"
if [[ -n "$raw_schema_matches" ]]; then
  echo "❌ Raw prompt schema still documented:"
  echo "$raw_schema_matches"
  errors=$((errors + 1))
else
  echo "✅ Raw prompt schema is not documented as default"
fi

if grep -q 'echo .*\$root' .agents/hooks/bash-worktree-fix.sh; then
  echo "❌ bash-worktree-fix.sh prints the absolute repository root"
  errors=$((errors + 1))
else
  echo "✅ bash-worktree-fix.sh prints a placeholder instead of the absolute root"
fi

if [[ $errors -gt 0 ]]; then
  exit 1
fi
