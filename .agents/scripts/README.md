# Delano Runtime Scripts

This folder contains the script runtime described in `HANDBOOK.md`.

Canonical path: `.agents/scripts/...`

Compatibility path: `.claude/scripts/...` when the mirror is present.

## PM scripts (`.agents/scripts/pm/`)

Critical path:
- `init.sh`
- `validate.sh`
- `status.sh` (`--open` and `--brief` are available for compact startup context)
- `next.sh`
- `blocked.sh`

Operational:
- `standup.sh`
- `in-progress.sh`
- `prd-list.sh`
- `epic-list.sh`
- `search.sh`

## Audit and utility
- `log-event.sh` / `log-event.js`
- `query-log.sh`
- `test-and-log.sh`
- `check-path-standards.sh`
- `check-text-safety.mjs`
- `fix-path-standards.sh`
- `git-sparse-download.sh`
