# Codex adapter

## Start here

1. Read root `AGENTS.md` first.
2. Use this note only for Codex-specific execution reminders.
3. Inspect `git status --short --branch` and the assigned `.project` contract before editing.

## Runtime paths

- Delivery contracts: `.project/`
- Canonical runtime scripts, hooks, rules, and skills: `.agents/`
- Compatibility path if needed: `.claude/`

## Commands

- `bash .agents/scripts/pm/validate.sh`
- `npm test`
- `npm run build:assets`
- `npm run check:package-manifest`

## Completion and safety

Keep changes task-scoped, record evidence before marking done, and report exactly which validation commands passed or were not run. Do not force-push, apply remote writes, commit unsafe logs, or expose local absolute paths unless an explicit task instruction requires it.
