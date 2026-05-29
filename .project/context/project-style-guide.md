# Project Style Guide

## Naming
- Product name: `Pointa`.
- Server package and CLI: `pointa-server`.
- Root package: `pointa`.
- Delano project slugs should be lowercase kebab-case and should describe the
  delivery outcome, for example `chrome-store-readiness` or
  `mcp-issue-reporting`.
- Keep version numbers synchronized across `package.json`,
  `annotations-server/package.json`, and `extension/manifest.json`.

## Documentation Conventions
- Update this context pack when architecture, release process, runtime
  constraints, testing expectations, or product scope change.
- Prefer evidence-backed statements with file references in commit messages,
  progress notes, or final summaries.
- Record unresolved uncertainty directly instead of presenting assumptions as
  confirmed facts.
- Use "extension" for the Chrome runtime, "server" or `pointa-server` for the
  local Node/MCP package, and "Delano project contracts" for files under
  `.project/projects/`.

## Review Expectations
- Run `delano validate` after touching `.agents/`, `.project/`, `AGENTS.md`, or
  `HANDBOOK.md`.
- Run `npm run lint` from the repo root for JavaScript lint changes when
  dependencies are installed.
- Run `cd annotations-server && npm test` when server packaging or release paths
  are touched, noting that the current script is a stub.
- For extension UI/content changes, reload the unpacked extension, refresh the
  target localhost page, and test the affected popup, content script, background
  service worker, and console paths manually.
- Do not manually edit `CHANGELOG.md` or release version fields unless the task
  explicitly requires a version sync via `scripts/sync-versions.js`.
