# Firefox AMO innerHTML Audit

Date: 2026-05-29

Command run:

```powershell
npm run firefox:lint
```

Result: `web-ext lint` reported `0` errors, `0` notices, and `46` warnings. This audit covers the `26` `UNSAFE_VAR_ASSIGNMENT` warnings for `innerHTML`; the other `20` warnings are Firefox `debugger` API support warnings.

Follow-up hardening already applied in this workstream:

- annotation create/edit modals now escape page-derived selectors and stored
  annotation comments before template insertion;
- bug replay success/failure modals now escape prompt attribute values, replay
  error messages, and page-derived replay steps;
- bug/performance report IDs and several timeline/resource values now escape
  dynamic text before rendering;
- `PointaUtils.escapeHtml()` now defensively stringifies nullish input and
  `PointaUtils.escapeAttribute()` covers quoted attribute values.

These changes reduce risk but do not remove the lint warnings. AMO submission
should still treat the release-blocker/deferred rows below as requiring either
DOM-node refactors or an explicit review waiver.

## High-Level Disposition

AMO submission should not proceed with the current `innerHTML` warnings unaddressed. Several are static UI shells and likely acceptable for internal builds, but multiple warning paths render user-, page-, or server-provided strings into HTML templates. Those should be refactored before AMO review.

Recommended refactor pattern: keep static shell markup small, then assign dynamic values using `textContent`, `value`, `dataset`, `classList` with allowlists, and `style` properties with validation. Avoid putting dynamic strings inside template literals that are assigned to `innerHTML`, even when an existing escape helper is used.

## Warning Disposition

| File / lint line | Disposition | Notes and required action |
| --- | --- | --- |
| `content/content.js:646` | release blocker/deferred | Edit annotation modal interpolates `context.selector`, viewport/position values, and `annotation.comment` inside an `innerHTML` template. `annotation.comment` is user/server data and `context.selector` is page-derived. Refactor before AMO; set textarea `.value` and selector `.textContent` after shell creation. |
| `content/content.js:749` | release blocker/deferred | New annotation modal interpolates `context.selector` and page-derived element geometry into an `innerHTML` template. Geometry is low-risk numeric data, but selector text is page-derived and should be assigned via `textContent`. |
| `content/modules/bug-replay-engine.js:212` | safe static template | Replay progress overlay uses static copy plus `totalSteps`. Coerce numeric count and assign with `textContent` if zero-warning AMO cleanup is pursued. |
| `content/modules/bug-replay-engine.js:256` | refactor-needed | Success modal puts `bugId` into `promptText`, then into an `<input value="...">`. Bug IDs are generated locally/server-side but should still be assigned with `.value`. |
| `content/modules/bug-replay-engine.js:297` | release blocker/deferred | Replay failure modal renders `error.message` and `originalSteps`. `originalSteps` are built from recorded page element text/IDs/classes, so this is page-provided content. Refactor before AMO. |
| `content/modules/bug-report-ui.js:129` | release blocker/deferred | Timeline review modal inserts `timelineHTML` and key issue rows. Some fields are escaped, but event severity/class tokens, keypress values, network methods/URLs/status/errors, and generated timeline HTML include page/runtime data. Refactor with DOM nodes and allowlisted class names. |
| `content/modules/bug-report-ui.js:339` | safe static template | Bug report form renders static UI and numeric summary counts/booleans from recording data. Low security risk for internal builds; still needs DOM/text assignment to remove AMO warning. |
| `content/modules/bug-report-ui.js:407` | refactor-needed | Confirmation modal renders `bugReportId` through `formatBugId()`, which returns HTML including the raw ID. IDs are expected generated values but should be split into text nodes and a static date span. |
| `content/modules/bug-report-ui.js:791` | escaped/text assignment already used | `escapeHtml()` creates a temporary div, assigns `textContent`, and returns `div.innerHTML`. This warning is a false positive on the helper pattern, but the helper still contributes to AMO warning count. |
| `content/modules/design-mode.js:951` | safe static template | Success overlay currently receives only static local messages from known call sites. Use `textContent` if this ever accepts dynamic messages or for zero-warning AMO cleanup. |
| `content/modules/floating-toolbar.js:72` | safe static template | Toolbar shell is static apart from internal theme/status values and extension icon URL. Likely acceptable for internal builds. |
| `content/modules/floating-toolbar.js:327` | release blocker/deferred | Panel container receives HTML from `ToolbarPanels.buildPanel()`. That path includes annotations, report IDs, page URLs, annotation status/classes, and design preview data. Treat this sink as AMO-blocking until `ToolbarPanels` builds DOM nodes or fully constrains dynamic fields. |
| `content/modules/floating-toolbar.js:580` | release blocker/deferred | Same panel refresh sink as line 327, used when active panel content is rebuilt. Refactor together with `ToolbarPanels.buildPanel()`. |
| `content/modules/onboarding-overlay.js:32` | safe static template | Initial onboarding step uses static project-controlled markup. No user/page/server strings found. |
| `content/modules/onboarding-overlay.js:89` | safe static template | Step replacement uses static project-controlled markup selected by numeric step index. |
| `content/modules/onboarding-overlay.js:193` | safe static template | Agent instructions are selected from a hard-coded map. `mcpHttpUrl` comes from the canonical local helper. Likely acceptable for internal builds. |
| `content/modules/onboarding-overlay.js:840` | safe static template | Copy button restores `originalText` captured from the same static onboarding button template. Low risk. |
| `content/modules/performance-report-ui.js:153` | release blocker/deferred | Performance dashboard inserts generated device/resource/insight/interaction HTML. Some text is escaped, but resource `type`, resource URL/name, duration values, connection data, and class tokens should be validated/assigned as text. |
| `content/modules/performance-report-ui.js:494` | refactor-needed | Confirmation modal renders `perfReportId` through `formatPerfId()`, which returns HTML including the raw ID. Use text nodes plus a static date span. |
| `content/modules/performance-report-ui.js:790` | escaped/text assignment already used | Same safe helper pattern as `BugReportUI.escapeHtml()`: assigns `textContent` then reads `innerHTML`. False positive, but still a warning. |
| `content/modules/report-details.js:50` | release blocker/deferred | Bug report details modal renders server/local report data: `bugReport.id`, screenshot IDs/paths, status sections, key issues, timeline HTML, event methods/URLs/status/errors, and keypress data. Some fields are escaped, but not all. Refactor before AMO. |
| `content/modules/toolbar-panels.js:757` | refactor-needed | Inline delete confirmation puts `annotationId` into a `data-annotation-id` attribute through a template. Assign `dataset.annotationId` after creating the button. |
| `content/modules/toolbar-panels.js:1030` | safe static template | Page delete confirmation uses static text plus `annotationIds.length`. Coerce/assign count with `textContent` during zero-warning cleanup. |
| `content/modules/design-editor-ui.js:178` | release blocker/deferred | Design editor includes `scopeOptionsHTML`; labels can include `scopeInfo.componentName`, `containerName`, and `parentTag`, which are derived from the inspected page. `element.textContent` is escaped, but scope labels are not. Refactor before AMO. |
| `content/modules/inspiration-mode.js:732` | release blocker/deferred | Metadata panel renders page-derived `tagName`, `className`, computed CSS values, pseudo-state values, and color swatch style strings. Use text assignment and validated style properties. |
| `content/modules/inspiration-mode.js:1396` | safe static template | Action panel is static UI. Responsive breakpoint labels are extracted with a numeric `px` regex and selected states are fixed labels. Low risk for internal builds. |
| `content/modules/inspiration-mode.js:2187` | safe static template | Responsive capture progress modal is static shell plus internal step/progress labels. |
| `content/modules/inspiration-mode.js:2224` | safe static template | Responsive progress update uses internal breakpoint labels and numeric counters. Use text nodes to remove warning. |

## AMO-Blocking Paths

These paths appear to render user-, page-, or server-provided strings through `innerHTML` and should be changed before AMO submission:

- `content/content.js`: annotation comments and page-derived selectors.
- `content/modules/design-editor-ui.js`: page-derived scope labels.
- `content/modules/inspiration-mode.js`: page-derived class names and computed CSS metadata.
- `content/modules/floating-toolbar.js` plus `content/modules/toolbar-panels.js`: annotation/report/panel HTML sink, including annotation IDs, URLs, statuses, comments, and design previews.
- `content/modules/report-details.js`: stored bug report details, timeline data, URLs, IDs, and server/action notes.
- `content/modules/bug-report-ui.js`: timeline/review data and report IDs.
- `content/modules/performance-report-ui.js`: performance resources, URLs, report IDs, and dashboard data.
- `content/modules/bug-replay-engine.js`: replay errors and page-derived step descriptions.

## Likely Acceptable For Internal Builds

These warning areas are static UI shells, numeric-only interpolation, icon swaps, or controlled setup content. They are still warnings, but they do not appear to carry untrusted strings today:

- `content/modules/onboarding-overlay.js`
- `content/modules/floating-toolbar.js:72`
- `content/modules/design-mode.js:951`
- `content/modules/inspiration-mode.js:1396`, `:2187`, `:2224`
- `content/modules/bug-report-ui.js:339`
- `content/modules/toolbar-panels.js:1030`
- `content/modules/bug-replay-engine.js:212`

## Cleanup Order

1. Refactor AMO-blocking modals and panels first: `content/content.js`, `report-details.js`, `bug-report-ui.js`, `performance-report-ui.js`, `design-editor-ui.js`, and `inspiration-mode.js`.
2. Change `ToolbarPanels.buildPanel()` and `FloatingToolbar` panel rendering so panel content is built as DOM nodes/fragments instead of HTML strings.
3. Replace helper false positives (`escapeHtml()` returning `div.innerHTML`) with a shared `appendText()`/DOM builder pattern where practical.
4. Convert static shell warnings last if the goal is a zero-warning AMO lint run.
