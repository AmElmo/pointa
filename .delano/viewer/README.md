# Delano Read-Only Viewer

Minimal local frontend for browsing `.project` markdown contracts.

- Read-only: serves files from `.project` and does not write delivery state.
- Default starting URL: `http://127.0.0.1:3977`
- Override starting port: `DELANO_VIEWER_PORT=3987 npm run viewer`
- Multiple viewers can run at once. If the starting port is already in use, the viewer tries the next available port and prints the actual URL.

Run from the repository root:

```bash
npm run viewer
```

The viewer indexes `.project/context/**/*.md`, `.project/templates/**/*.md`, and `.project/projects/**/*.md`. It derives artifact roles (`spec`, `plan`, `workstream`, `task`, `progress`, `decision`, `context`, `template`), status fields, task/workstream relationships, relationship-like wikilinks, snippets, and renders markdown in a Tolaria-inspired read-only pane layout.

Project folders get a right-side outline for the spec, plan, decisions/progress, workstreams, and tasks. Selecting a workstream focuses the list on that workstream and its subtasks. Context and template folders keep filters scoped to the roles/statuses that actually exist in the selected folder.

The reader stays read-only, but includes convenience buttons to open the selected markdown file's containing folder in the system explorer or open the file in VS Code. These actions are guarded so they only target markdown files inside `.project`.
