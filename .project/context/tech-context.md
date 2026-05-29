# Tech Context

## Stack
- Root package: private Node package named `pointa`, version synced with the
  extension and server.
- Extension: Chromium Manifest V3, vanilla JavaScript, CSS, HTML, service worker
  in `extension/background/background.js`, content scripts in
  `extension/content/`, popup files in `extension/popup/`, and static assets in
  `extension/assets/`.
- Server: Node.js ESM package `pointa-server` in `annotations-server/`, using
  Express, CORS, multer, WebSocket `ws`, `@modelcontextprotocol/sdk`,
  `node-persist`, `commander`, `chalk`, and `@linear/sdk`.
- Release: semantic-release on `main`, GitHub Actions Node 20, npm publishing
  from `annotations-server/`, GitHub release asset `pointa-extension.zip`, and
  version sync via `scripts/sync-versions.js`.
- Delano: shared runtime under `.agents/`, repo-owned delivery state under
  `.project/`, Codex hook config under `.codex/hooks.json`, and local viewer
  assets under `.delano/`.

## Runtime Constraints
- Node.js 18.0.0 or newer is required by `annotations-server/package.json`; CI uses
  Node 20.
- The server defaults to `http://127.0.0.1:4242`; the extension has that port
  hardcoded in `extension/background/background.js`. `POINTA_PORT` can change
  the server port, but the extension must also be updated or configured to match.
- User data is local and lives under `~/.pointa/`, including annotations, issue
  reports, archives, screenshots, inspiration captures, config, PID, and logs.
- The extension primarily enables annotation and issue features on localhost or
  local development domains: `localhost`, `127.0.0.1`, `0.0.0.0`, `*.local`,
  `*.test`, and `*.localhost`.
- Extension code uses vanilla globals and script loading rather than ES module
  imports, bundling, or transpilation.
- Server file writes are serialized through save-lock promise chains. Do not
  bypass those locks for annotations, issue reports, or inspirations.

## Integration Points
- MCP transports: HTTP endpoint `/mcp`, SSE support, and stdio mode for editors
  that spawn `npx -y pointa-server`.
- Extension-server API includes annotations, images, inspirations, bug reports,
  backend logs, AI tool detection, and Linear issue creation endpoints.
- MCP tools include annotation reads and review marking, annotation image reads,
  issue report reads, issue rerun/review/resolution transitions, and project URL
  filtering guidance.
- Chrome APIs include storage, tabs, activeTab, scripting, and debugger. The
  debugger permission is used for screenshot capture and viewport emulation and
  must be justified for Chrome Web Store submission.
- Demo/QA fixture workflow: `scripts/load-demo.sh`,
  `scripts/clear-demo.sh`, `testing/fixtures/demo/`, and
  `testing/demo-app/index.html`.
- Release workflow depends on `NPM_TOKEN`, `GITHUB_TOKEN`, conventional commits,
  `annotations-server/package-lock.json`, `.releaserc.json`, and
  `.github/workflows/release.yml`.
