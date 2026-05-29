# Agent Instructions

This repository uses the Delano runtime installed under `.agents/` and project
contracts under `.project/`. Treat `.agents/README.md`, `HANDBOOK.md`, and
`.project/context/` as the shared operating context before starting work.

## Working Flow

- Check the relevant project or task contract in `.project/projects/` when one
  exists.
- Keep implementation changes scoped to the requested work and preserve
  unrelated local changes.
- Record project updates through the Delano commands or templates when changing
  delivery state.
- Run `delano validate` before closeout when the runtime or project contracts
  are touched, and report any remaining validation failures.

## Runtime Map

- Shared scripts: `.agents/scripts/`
- PM commands: `.agents/scripts/pm/`
- Skills: `.agents/skills/`
- Hooks: `.agents/hooks/`
- Project context: `.project/context/`
- Project registry: `.project/registry/`

Do not publish secrets, raw prompt text, or machine-specific absolute paths in
repo docs, contracts, logs, or generated artifacts.
