# System Patterns

## Handbook-First Delivery
- Agents should start from `AGENTS.md`, then use this context pack and
  `HANDBOOK.md` to understand delivery rules. Delano project contracts should be
  created before future scoped initiatives are treated as tracked workstreams.

## File-Contract-First State
- Pointa product truth currently lives in source files and docs because no
  `.project/projects/*` contracts exist yet. Once contracts exist, keep progress,
  evidence, decisions, and task state in `.project/projects/project-slug/` and keep this
  context pack as durable repo memory.
- User runtime state belongs in `~/.pointa/`, not in the repository. Fixture
  scripts may copy data into that directory only with backup/restore behavior.

## Thin Runtime Wrapping
- The extension has no build step. Do not introduce bundling, transpilation, or
  module imports into extension runtime files without an explicit architecture
  decision.
- Keep the server's CLI and daemon behavior compatible with existing MCP setup
  examples: command-based `npx -y pointa-server`, manual HTTP endpoint
  `http://127.0.0.1:4242/mcp`, and server management commands.
- Preserve serialized server writes. Annotation, issue, and inspiration save
  paths use promise-lock patterns to prevent concurrent file-write races.

## Compatibility Without Dual Truth
- `.agents/` is the canonical Delano runtime. `.claude/` compatibility files are
  absent and should not become a second source of truth unless explicitly added
  for adapter compatibility.
- Root `CLAUDE.md` predates Delano and remains useful repo context, but persistent
  cross-agent instructions should be normalized through `AGENTS.md` and
  `.project/context/`.

## Conservative Installation
- Keep Delano installer output repo-local and validation-clean. If `delano install`
  refreshes runtime files, run `delano validate` afterward.
- Do not overwrite user data in `~/.pointa/` outside documented demo fixture
  workflows.
- Preserve release automation assumptions: conventional commits on `main`,
  `annotations-server/package-lock.json` committed, `NPM_TOKEN` configured for
  npm publish, and Chrome Web Store publishing performed manually from the GitHub
  release zip.
