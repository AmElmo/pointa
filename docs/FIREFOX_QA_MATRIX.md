# Firefox Manual QA Matrix

Use this matrix for the current Firefox port. Firefox builds are generated into
`dist/firefox/`; rebuild them from shared source instead of editing generated
files. Use the evidence labels from `docs/FIREFOX_EVIDENCE_CAPTURE.md`:
`Available`, `Approximate`, and `Unavailable`.

## Setup Commands

From the repo root:

```bash
npm install
npm run firefox:build
npm run firefox:lint
```

Manual Firefox load:

```text
about:debugging#/runtime/this-firefox
Load Temporary Add-on... -> dist/firefox/manifest.json
```

Repeated development profile:

```bash
npm run firefox:run
```

Pointa server:

```bash
cd annotations-server
npm run dev
```

Optional demo fixture run:

```bash
./scripts/load-demo.sh
python3 -m http.server 8080
```

Default demo URL:

```text
http://localhost:8080/testing/demo-app/index.html
```

Restore demo fixture data after testing:

```bash
./scripts/clear-demo.sh
```

Do not run `npm run firefox:lint` and `npm run firefox:package` in parallel
because both rebuild `dist/firefox/`.

## Run Record

| Field | Value |
| --- | --- |
| Tester / date |  |
| Git commit or build label |  |
| Firefox version / channel |  |
| Launch method | `npm run firefox:run` / temporary add-on / signed test build |
| Extension manifest loaded | `dist/firefox/manifest.json` |
| Pointa server state | Running on `http://127.0.0.1:4242` / MCP-managed / stopped for offline row |
| Backend log capture state | Off / enabled in bug UI / app launched with `pointa-server dev <command>` |
| Demo page server state | Running on port `8080` / other: |
| Demo URL | `http://localhost:8080/testing/demo-app/index.html` / other: |
| Local data state | Clean / demo fixtures loaded / existing data retained |

## Matrix

| ID | Scenario | Setup | Steps | Expected evidence | Pass/fail notes |
| --- | --- | --- | --- | --- | --- |
| FQ-01 | Firefox package and injection baseline | Server running; demo URL open in Firefox with the generated add-on loaded. | Click the Pointa toolbar icon. Open and close the toolbar/sidebar. Refresh the page and repeat once. | Toolbar/sidebar inject on the supported local page without duplicate UI. Background and page consoles show no uncaught injection or permission errors. |  |
| FQ-02 | Annotation CRUD | Server running; demo URL loaded; use clean data or note fixture state. | Create an annotation on a visible element. Reload the page. Edit the comment or status. Delete/archive the annotation from the UI. | Created annotation persists after reload, remains linked to the target element, edit/status changes are reflected in the UI/server data, and deleted/archived annotation no longer appears as active. |  |
| FQ-03 | Element relink resilience | Server running; create an annotation on an element with stable attributes or text. | Reload the page. If the demo supports DOM changes, make a minor DOM/order change and reload. Reopen Pointa. | Annotation resolves by stable element signals when available and falls back without crashing. If relink fails, the UI shows a recoverable missing-target state instead of an uncaught error. |  |
| FQ-04 | Element-linked screenshots | Server running; demo URL loaded; target element visible in viewport. | Create or edit an annotation with screenshot capture enabled. Open the saved annotation details and image preview. | Firefox captures a visible-tab screenshot and crops the visible target element when possible. The image is attached to the annotation; capture errors are structured and do not prevent non-image annotation evidence from saving. |  |
| FQ-05 | Image storage and MCP payloads | Server running; annotation from FQ-04 has at least one image; MCP client configured for Pointa. | Read current page annotations through MCP. Call the image retrieval tool for the annotation image. Compare returned metadata to the UI image. | MCP annotation data reports `has_images: true`, `image_count` greater than zero, and `image_paths` under `images/{annotationId}/...`. Image retrieval returns base64 data URLs and does not expose machine-specific absolute paths. |  |
| FQ-06 | Console logs in issue recording | Server running; start a bug/issue recording on the demo URL. | After recording starts, run `console.log("pointa-qa-log")`, `console.warn("pointa-qa-warn")`, and `console.error("pointa-qa-error")` from the page console. Stop and save the report. | Timeline includes post-start console events with timestamp, relative time, level, message, and page source context. Treat this as `Approximate`; browser-level CDP log parity is not expected. |  |
| FQ-07 | Runtime page errors | Server running; bug/issue recording active. | From the page console, run `setTimeout(() => { throw new Error("pointa-qa-runtime-error"); }, 0)`. Stop and save the report. | Timeline contains a page/runtime error entry, either as `page-error` or `console-error` with `subtype: page-error`, including message and source file/line/column when Firefox exposes them. |  |
| FQ-08 | Promise rejections | Server running; bug/issue recording active. | From the page console, run `Promise.reject(new Error("pointa-qa-rejection"))`. Stop and save the report. | Timeline contains an unhandled rejection entry, either as `unhandled-rejection` or `console-error` with `subtype: unhandled-rejection`. Rejection reason is stringified without breaking the recorder. |  |
| FQ-09 | Network metadata and failures | Server running; bug/issue recording active. | Run `fetch(window.location.href + "?pointaQa=network")`. Then run `fetch("http://localhost:9/pointa-qa-failure").catch(() => {})`. Stop and save the report. | Timeline records fetch/XHR request metadata, response status when available, request URL, method, request ID or timing context when available, and failed request reason. Response bodies are not expected in Firefox. |  |
| FQ-10 | Backend logs | Pointa server running; start a local test app through `pointa-server dev <app command>`; backend log toggle enabled in the bug UI. | Start a bug/issue recording. Trigger the app to write a normal log and an error log. Stop and save the report. | Report timeline includes backend events from the shared backend-log bridge with source `backend` and backend log/warn/error types. `/api/backend-logs/status`, start, stop, and read flows work without browser-specific schema changes. |  |
| FQ-11 | Offline Pointa server behavior | Stop the Pointa server. Keep Firefox and the demo page open. | Click the toolbar icon, open existing UI if possible, then try to create an annotation or save a report. Restart the server and retry the save. | Offline state is visible and actionable. Failed saves are not falsely reported as successful. No uncaught content/background errors occur. Retrying after the server returns succeeds or gives a clear remaining error. |  |
| FQ-12 | Restricted pages | Add-on loaded; server state does not matter. | Open `about:addons` or `about:debugging` and click the Pointa toolbar icon. Repeat on a non-local public page such as `https://example.com`. | Browser-restricted schemes are not injected and do not crash. Non-local pages do not receive unexpected local-development behavior or permission escalation; any limitation message is user-facing and not debugger/CDP-specific. |  |
| FQ-13 | Firefox permissions and host scope | Run `npm run firefox:build`; inspect the generated manifest or Firefox add-on permission view. | Confirm API permissions and host permissions. Load the add-on and note the install/runtime permission prompts. | Firefox package requests `activeTab`, `storage`, and `scripting`; host permissions cover localhost, `127.0.0.1`, `0.0.0.0`, `*.local`, `*.test`, `*.localhost`, and `<all_urls>` for persistent visible-tab screenshot capture. It does not request `debugger` or broad `tabs`. |  |
| FQ-14 | Design mode | Server running; demo URL loaded; choose an element with page-derived text/classes. | Open design mode from the Pointa UI. Select the element, make a small design note/change, save or capture the design item, then reopen it. | Design mode is usable on the supported local page. Saved design context remains linked to the selected element, visible screenshots/previews are retained when supported, and page-derived labels render as text without broken/raw HTML. |  |
| FQ-15 | Inspiration capture | Server running; demo URL or another supported local page loaded. | Start inspiration capture, select a visible component, save the capture, and reopen the saved inspiration. | Capture stores screenshot/visual context and CSS/element metadata available to the UI/server. Page-derived tag, class, and computed-style metadata render safely. If a non-local page is not supported, the limitation is explicit. |  |
| FQ-16 | Degraded responsive capture | Firefox add-on loaded; open the bug, performance, design, or inspiration UI area that exposes responsive capture in Chrome. | Look for responsive viewport capture controls. If a control is visible, attempt to use it. | Responsive viewport capture is hidden or disabled in Firefox with user-facing unavailable-state copy. No `debugger` permission prompt, CDP error, or full-page/responsive screenshot promise appears. Mark as `Unavailable`, not a failure, when the UI communicates this clearly. |  |
| FQ-17 | AMO warning touchpoints during QA | Server running; use rows FQ-02, FQ-10, FQ-14, and FQ-15. | Enter annotation comments, trigger report details, design labels, and inspiration metadata that include characters like `<`, `>`, quotes, and ampersands. | UI remains readable and stable. Known `innerHTML` lint warnings are release-readiness items, but manual QA should still fail any row that renders raw markup, loses text, or breaks the modal/panel. |  |

## Source Docs

- `docs/FIREFOX_PORT.md`
- `docs/FIREFOX_EVIDENCE_CAPTURE.md`
- `docs/FIREFOX_RELEASE.md`
- `docs/FIREFOX_AMO_INNERHTML_AUDIT.md`
- `docs/FIREFOX_WEB_EXT_SMOKE.md`
