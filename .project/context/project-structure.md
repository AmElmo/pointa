# Project Structure

## Canonical Boundaries
- `AGENTS.md`: repo entrypoint for agent instructions, Delano runtime pointers,
  validation expectations, and privacy/path-safety reminders.
- `HANDBOOK.md`: Delano process and operator handbook installed with the runtime.
- `.project/`: repo-owned delivery truth for context, registry files, templates,
  and future project contracts.
- `.agents/`: canonical shared Delano runtime, including PM scripts, skills,
  rules, hooks, schemas, fixtures, and validation helpers.
- `.codex/`: Codex hook configuration. Hooks still require Codex feature enablement
  and trust approval before they run.
- `.delano/`: Delano local presentation/viewer assets.
- `.claude/`: not present. Delano validation reports this only as compatibility
  runtime absence; `.agents/` is canonical.

## Runtime Areas
- `extension/manifest.json`: Chrome extension metadata, permissions, host
  permissions, icons, and service worker declaration. Firefox/Zen manifests are
  generated from this source by `scripts/build-firefox-extension.js`.
- `extension/background/`: service worker and API-server bridge logic.
- `extension/content/`: content script entrypoint, CSS, and feature modules for
  annotations, design mode, bug/performance recording, sidebar, toolbar, theming,
  selectors, inspirations, and replay.
- `extension/popup/`: lightweight popup passthrough and theme assets.
- `annotations-server/bin/cli.js`: `pointa-server` CLI, daemon management,
  status/log commands, stdio bridge behavior, and `pointa-server dev`.
- `annotations-server/lib/server.js`: Express API, MCP server, storage, WebSocket
  backend log capture, Linear endpoints, and tool handlers.
- `annotations-server/lib/dev-runner.js` and `preload.cjs`: dev-command wrapping
  and backend log capture support.
- `scripts/sync-versions.js`: synchronizes root package, server package, and
  extension manifest versions.
- `scripts/build-firefox-extension.js`: generates the Firefox/Zen package under
  `dist/firefox/` from the shared extension source.
- `scripts/load-demo.sh` and `scripts/clear-demo.sh`: fixture loading and restore
  around `~/.pointa/`.

## Documentation Areas
- `README.md`: product overview, quick start, MCP setup, backend log capture, and
  high-level architecture.
- `CLAUDE.md`: detailed repo operating context, release rules, architecture, and
  important implementation constraints.
- `annotations-server/README.md`: server installation, CLI commands, MCP
  transports, and MCP tool list.
- `docs/DEVELOPMENT.md`: extension loading, reload workflow, debugging, local
  server development, and testing checklist.
- `docs/ANNOTATION_DATA_FORMATS.md`: annotation, message, and status schemas.
- `docs/UPDATE_SYSTEM.md`: extension/server update notification behavior and
  version compatibility.
- `docs/FIREFOX_PORT.md`, `docs/FIREFOX_RELEASE.md`, and related Firefox docs:
  Firefox/Zen packaging, evidence capture, AMO readiness, and release status.
- `testing/DEMO.md`: demo fixture workflow and troubleshooting.
- `CHROME_STORE_SUBMISSION_CHECKLIST.md`: store readiness issues and submission
  requirements.

## Working Notes
- Runtime data under `~/.pointa/` is local user data and should not be committed.
- `annotations-server/.gitignore` ignores `*.json` by default but explicitly
  allowlists `package.json` and `package-lock.json`; add exceptions for any new
  tracked JSON file in that directory.
- `CHANGELOG.md` and release version numbers are semantic-release managed. Prefer
  `scripts/sync-versions.js` for manual version synchronization when necessary.
- `pointa-extension.zip`, logs, temp files, `node_modules/`, and local session
  files are ignored artifacts.
