# Pointa Context Pack

This folder is the current Delano context pack for Pointa. It should describe the
repo as it exists now: a Chrome extension plus local Node/MCP server for visual
localhost annotations, issue reports, design capture, and AI coding-agent
integration.

Read order for new work:

- `project-overview.md` and `project-brief.md` for mission, scope, and open gaps.
- `tech-context.md`, `system-patterns.md`, and `project-structure.md` before code changes.
- `product-context.md` and `gui-testing.md` before product or UI work.
- `project-style-guide.md` and `progress.md` before closeout.

Current source-of-truth note: no Delano project contracts exist yet under
`.project/projects/`. Until those are created, use `README.md`, `CLAUDE.md`,
`docs/`, `annotations-server/README.md`, `package.json`,
`annotations-server/package.json`, `extension/manifest.json`, and source files as
the active evidence base.

Validate this pack with `delano validate` and inspect delivery state with
`delano status --brief`.
