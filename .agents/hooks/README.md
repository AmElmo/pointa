# Delano Hook Layer

This directory contains optional runtime hooks for session and mutation tracking.

Default hooks:
- `session-tracker.js`
- `post-tool-logger.js`
- `user-prompt-logger.js`
- `bash-worktree-fix.sh`
- `codex-session-status.js`

The logging hooks append JSONL records in `.agents/logs/`.

`codex-session-status.js` is used by the optional `.codex/hooks.json` SessionStart
configuration. It emits `delano status --open --brief` context and fails open if
the local runtime is not available.
