# Firefox Evidence Capture

Pointa's Chrome extension uses Chrome DevTools Protocol through
`chrome.debugger` for network, console, runtime, and responsive viewport evidence.
Firefox does not implement that API, so Firefox evidence capture must use
standard WebExtension capabilities and clear degraded states.

## Capture Model

Firefox issue reports should compose evidence from four supported channels:

1. Page instrumentation
2. Extension-observed network metadata
3. Existing backend log bridge
4. Visible-tab screenshots

Each event written to an issue timeline should include:

- `timestamp`
- `relativeTime`
- `source`: `page`, `network`, `backend`, or `extension`
- `type`
- URL or route context when available
- payload fields specific to the event type

## Page Instrumentation

Use a page-world injected script when recording starts. The current console
recorder is a packaged MAIN-world script injected through `scripting.executeScript`.
It wraps `console.log`, `console.warn`, and `console.error`, then forwards
structured events to the content script with DOM events.
Recorder config is passed through a temporary `data-pointa-*` DOM attribute
before the packaged file is injected. Do not use MAIN-world `func` injection for
recorder config or stop commands; Firefox/Zen can surface that as CSP-blocked
`eval` on pages that omit `unsafe-eval`.
The same page-world recorder also listens for `error` and `unhandledrejection`
events and stores them as `console-error` timeline entries with `subtype:
page-error` or `subtype: unhandled-rejection` so existing issue UI and summary
logic continue to work.

Supported event types:

- `console-log`
- `console-info`
- `console-warn`
- `console-error`
- `page-error`
- `unhandled-rejection`

Implementation notes:

- Keep wrappers reversible; stopping recording should restore original console
  methods and remove listeners.
- Capture only logs emitted after instrumentation starts.
- Serialize console arguments defensively to avoid throwing on cyclic objects.
- Do not persist raw objects directly; store concise stringified values and basic
  structured metadata.
- Store timestamp, relative time, level, message, source URL, and severity.

## Network Evidence

Use reversible page `fetch`/`XMLHttpRequest` instrumentation while bug recording
is active as the no-CDP fallback. The recorder is injected as a packaged
MAIN-world script through `scripting.executeScript`; config and stop events are
bridged through temporary DOM attributes/events from the isolated extension
world to avoid Firefox CSP `eval` warnings. There is no inline DOM-script
fallback for Firefox because page CSP can block it and emit noisy warnings. Use
`webRequest` only if the Firefox permission decision later accepts the added
permission cost.
The target is request metadata and failure evidence, not response body capture.
Issue timelines keep the existing `type: network` shape with `subtype: success`
or `subtype: failed`.

Supported event types:

- `network-request`
- `network-response`
- `network-error`

Minimum fields:

- request URL
- method
- status code when available
- error reason when available
- request ID
- document URL or tab ID when available
- timing fields exposed by Firefox

Response body capture is out of scope unless a supported, reviewable Firefox API
path is proven later.

## Backend Logs

Keep the existing `pointa-server dev` backend log channel. Firefox should call the
same server endpoints used by Chrome:

- `/api/backend-logs/status`
- `/api/backend-logs/start`
- `/api/backend-logs/stop`
- `/api/backend-logs`

Backend log events should keep their existing source labels and be merged into
issue timelines without browser-specific schema changes.

## Screenshots

Use `tabs.captureVisibleTab` for Firefox screenshots. Element-level screenshots
should crop the visible-tab image using content-side element geometry where
possible.
Firefox requires either `<all_urls>` or a current `activeTab` grant for
`tabs.captureVisibleTab`; the generated Firefox package requests `<all_urls>` so
screenshots still work from the persistent in-page toolbar after page reloads or
toolbar auto-reopen.

Screenshot capture errors should be returned as structured, actionable failures
so annotation and report saves can continue without dropping non-image evidence.

Supported:

- visible viewport screenshots
- element crop from visible screenshot
- screenshot attachment upload through the existing server endpoint

Firefox-created screenshot attachments use the existing Pointa image pipeline:
`/api/upload-image` stores files under `images/{annotationId}/...`, MCP
annotation reads expose `has_images`, `image_count`, and `image_paths`, and
`get_annotation_images` returns base64 data URLs for the saved files.

Design annotations and inspiration captures use the same visible screenshot and
local server storage model. See `docs/FIREFOX_DESIGN_INSPIRATION_COMPAT.md` for
the current compatibility notes and validation evidence.

Degraded or unavailable:

- Chrome CDP full-page capture
- Chrome CDP responsive viewport emulation
- capture beyond the visible viewport without a future Firefox-specific approach

## Parity Matrix

Use these labels in Firefox QA notes and user-facing degraded-state copy:

- **Available**: expected to work with the same user promise as Chrome.
- **Approximate**: captured with a Firefox-specific source and may miss browser-level data that CDP sees.
- **Unavailable**: not promised in Firefox until a supported implementation exists.

| Evidence | Chrome Today | Firefox Implementation | Status | User-Facing Label | Implementation Notes |
| --- | --- | --- | --- | --- | --- |
| Visible screenshot | `tabs.captureVisibleTab` or CDP | `tabs.captureVisibleTab` with `<all_urls>`/`activeTab` | Available | Screenshot captured | Visible viewport only. |
| Element screenshot | capture plus crop | visible capture plus content-side element geometry crop | Available for visible elements | Element screenshot captured | Offscreen/full-page element capture is not promised. |
| Console methods | CDP Runtime/Log | packaged MAIN-world console wrapper | Approximate | Console logs captured while recording | Captures post-start `log`, `warn`, and `error`; page code can theoretically interfere with MAIN-world wrappers. |
| Runtime exceptions | CDP Runtime | MAIN-world `error` listener | Approximate | Runtime errors captured while recording | Source file, line, and column are included when Firefox exposes them. |
| Promise rejections | CDP Runtime | MAIN-world `unhandledrejection` listener | Approximate | Promise rejections captured while recording | Reason is stringified defensively. |
| Network metadata | CDP Network | packaged MAIN-world `fetch`/`XMLHttpRequest` wrapper | Approximate | Fetch/XHR requests captured while recording | Browser-level requests outside page fetch/XHR may be missed unless a future `webRequest` path is accepted. |
| Network response body | not a core promise | unavailable | Unavailable | Response body capture unavailable in Firefox | Do not imply request/response bodies are captured. |
| Backend logs | `pointa-server dev` | same local server bridge | Available | Backend logs captured when `pointa-server dev` is connected | Uses `/api/backend-logs/*` endpoints. |
| Responsive viewport | CDP Emulation | unavailable | Unavailable | Responsive capture unavailable in Firefox | Chrome debugger/CDP emulation has no Firefox equivalent in this package. |

## Firefox UX Rules

- Hide controls that depend on unsupported Firefox capabilities, such as
  responsive viewport capture.
- Use user-facing limitation text such as "Responsive viewport capture is
  unavailable in this browser" instead of protocol or debugger terminology.
- Keep Chrome-only controls visible when the Chrome package reports the
  required capability.

## Privacy and Permission Impact

- Page instrumentation records local page console/error/network metadata only
  while recording is active.
- `webRequest` requires explicit Firefox permissions and should be justified as
  local development issue evidence.
- Backend logs are opt-in through `pointa-server dev`.
- Screenshots are user-initiated evidence attachments and remain local unless the
  user exports or syncs them through another tool.

## Follow-Up Tasks

- T-016: implement console instrumentation.
- T-017: capture page errors and unhandled rejections.
- T-018: capture network metadata and failures.
- T-019: preserve backend log capture in Firefox issue reports.
- T-020: keep the parity/degraded-state matrix current after implementation.
