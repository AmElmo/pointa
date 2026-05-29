---
name: Firefox Extension Port
slug: firefox-port
owner: team
status: complete
created: 2026-05-29T19:06:15Z
updated: 2026-05-29T21:48:19Z
outcome: Build the most complete practical Firefox version of Pointa while preserving the local-first annotation, screenshot, and evidence-capture workflow.
uncertainty: high
probe_required: true
probe_status: completed
---

# Spec: Firefox Extension Port

## Executive Summary

Porting Pointa to Firefox is viable for the core local-first workflow, but it is
not a manifest-only port. The Chrome extension depends on Manifest V3,
programmatic content-script injection, the local `pointa-server` API on port
4242, and Chrome DevTools Protocol access through `chrome.debugger`.

Firefox can support the core annotation, sidebar/toolbar, local server, MCP,
element-linked screenshots, and much of the issue evidence workflow. The high
risk area is CDP-dependent functionality: responsive viewport emulation and
bug/performance timeline capture using Network, Log, and Runtime debugger
domains. The Firefox build should replace those paths with supported browser
APIs where possible, including page instrumentation, `webRequest`, visible-tab
screenshot capture, and the existing backend-log bridge.

## Problem and Users

Firefox users should be able to use Pointa on localhost projects without
switching to Chromium. Maintainers need a port strategy that preserves one shared
extension codebase where possible while allowing browser-specific packaging,
permissions, and feature degradation.

## Outcome and Success Metrics

- A Firefox package can be linted with `web-ext lint` without errors.
- The Firefox add-on can be loaded with `web-ext run` and connect to
  `pointa-server` on `http://127.0.0.1:4242`.
- Core flows work on a localhost page: open Pointa, inject UI, create/read/update
  annotations, keep annotations linked to the intended element, attach
  screenshots, and expose annotation image data to MCP.
- Issue-report flows capture the richest Firefox-supported evidence set:
  console logs, errors, unhandled rejections, network metadata/failures, backend
  logs, screenshots, and user interaction context where feasible.
- CDP-dependent Chrome-only features are either replaced with supported Firefox
  APIs or clearly disabled with user-facing copy.
- Firefox release path is documented, including Gecko ID, data collection
  declaration, signing, and AMO or self-distribution choice.

## User Stories
- US-001: As a Firefox user, I want to annotate localhost UI with Pointa, so that
  I can feed precise UI feedback to my AI coding agent without using Chromium.
- US-002: As a maintainer, I want a generated Firefox package that shares most
  source files with Chrome, so that browser-specific differences do not create a
  long-lived manual fork.
- US-003: As a maintainer, I want Chrome-only debugger features guarded by
  capability checks, so that Firefox can run supported flows without runtime
  failures.
- US-004: As a reviewer or release operator, I want Firefox-specific permissions
  and data collection declarations to be explicit, so that AMO review risk is
  visible before submission.
- US-005: As a Firefox user reporting a bug, I want Pointa to attach screenshots,
  console logs, page errors, network failures, and backend logs when available,
  so that my AI coding agent gets actionable evidence instead of a vague report.

## Acceptance Scenarios
- AC-001: Given a Firefox build is generated, when `web-ext lint` runs against
  that build, then it reports no errors.
- AC-002: Given `pointa-server` is running and a localhost page is open in
  Firefox, when the user clicks the Pointa toolbar button, then the sidebar or
  toolbar injects and can create an annotation.
- AC-003: Given a Firefox user captures an annotation screenshot, when no
  responsive viewport override is active, then `tabs.captureVisibleTab` captures
  the visible tab image successfully.
- AC-004: Given a Firefox user opens a CDP-only feature, when no Firefox
  replacement exists, then the feature is disabled or degraded without throwing
  extension errors.
- AC-005: Given a packaged Firefox add-on is prepared for distribution, when the
  manifest is inspected, then it includes a Gecko add-on ID, compatible
  background declaration, data collection declaration, and no unsupported
  `debugger` permission.
- AC-006: Given Firefox issue recording is active, when the page emits console
  messages, runtime errors, failed requests, or backend logs, then supported
  events are attached to the saved issue timeline with timestamps and source
  labels.

## Scope
### In Scope
- Firefox desktop port of the extension.
- Generated or transformed Firefox manifest/package.
- Cross-browser API capability checks where needed.
- Replacement or graceful degradation of debugger-dependent features.
- Firefox-supported console/error/network/backend evidence capture.
- Strong annotation-to-element anchoring and screenshot attachment behavior.
- Firefox local-server connection and MCP workflow verification.
- Firefox development, linting, packaging, and signing plan.

### Out of Scope
- Replacing the Node `pointa-server` architecture.
- Rewriting the extension with a framework or bundler unless required by the
  packaging probe.
- Firefox for Android support until desktop Firefox MVP is validated.
- Chrome Web Store submission cleanup except where it overlaps AMO review risk.

## Functional Requirements

- Generate a Firefox-compatible extension source directory or package from the
  shared `extension/` source.
- Firefox manifest must use a supported background declaration and include
  `browser_specific_settings.gecko.id`.
- Firefox manifest must remove unsupported `debugger` permission.
- Extension runtime must not call `chrome.debugger` unless the API exists.
- Normal screenshot capture must use `tabs.captureVisibleTab`.
- Bug/performance capture must use supported fallbacks such as content-script
  instrumentation and `webRequest`, or be marked unavailable in Firefox.
- Firefox evidence capture must include console methods, page errors, unhandled
  promise rejections, failed network requests or request metadata where
  permitted, backend logs from `pointa-server dev`, and screenshots where
  capture permissions allow.
- Annotation element matching must preserve selector, stable attributes, text
  sample, geometry, parent-chain, URL, and fallback matching data.
- Content scripts must continue to communicate with the background script and
  local server API.

## Non-Functional Requirements

- Preserve local-first privacy: no new cloud dependency for Firefox.
- Keep the Chrome extension behavior intact.
- Keep browser-specific differences explicit in build or manifest generation.
- Keep permission prompts justified and explain localhost access plus Firefox
  all-site screenshot access in onboarding or listing copy.
- Maintain AMO review readiness by addressing required manifest fields and
  high-risk linter warnings.

## Assumptions
- Firefox desktop is the first target.
- Pointa can ship Firefox with a richer supported evidence model even if exact
  Chrome CDP parity remains unavailable.
- The existing local server CORS behavior remains sufficient for Firefox
  localhost content-script and background fetches.

## Needs Clarification
- Minimum Firefox version target.
- Distribution target: listed AMO, self-distributed signed XPI, or both.
- Whether Firefox for Android is required in the first release.
- Whether Firefox issue evidence must reach near-parity before public release or
  can ship as a clearly documented supported subset.

## Hypotheses and Unknowns

- Hypothesis: core annotation and MCP workflows can run with manifest/build
  changes and limited API compatibility shims.
- Unknown: whether Firefox AMO review will require refactoring all linter-reported
  `innerHTML` warnings before approval.
- Unknown: how much CDP timeline fidelity can be recovered with `webRequest`,
  main-world instrumentation, and backend-log capture.

## Touchpoints to Exercise

- `extension/manifest.json` transformation or generated Firefox manifest.
- `extension/background/background.js` injection, screenshot, API bridge, and
  debugger-dependent methods.
- `extension/content/content.js` and modules for annotation, toolbar/sidebar,
  bug/performance, design, and inspiration flows.
- `annotations-server/lib/server.js` CORS, health, annotation, bug report, and
  screenshot endpoints.
- `web-ext lint`, `web-ext run`, and signed package workflow.

## Probe Findings

- `web-ext lint --source-dir extension --output json` reports two current errors:
  Firefox-compatible background fallback is missing, and a Gecko add-on ID is
  required for MV3.
- The same lint run flags `debugger` permission and all `chrome.debugger` calls
  as unsupported by Firefox.
- Mozilla docs confirm Firefox supports `scripting` and `tabs.captureVisibleTab`,
  but not Chrome's `debugger` API.

## Footguns Discovered

- Firefox MV3 background behavior differs from Chrome; relying only on
  `background.service_worker` fails Firefox lint.
- Host permissions in Firefox install prompts need a clear story, especially if
  adding broader localhost HTTPS patterns.
- Page-global instrumentation must account for Firefox content-script isolation.
- Firefox signing requires a stable add-on ID and AMO/self-distribution process.

## Remaining Unknowns

- Target minimum Firefox version and desktop-only versus Android scope.
- Final decision on MVP degradation versus full parity.
- AMO review tolerance for current dynamic `innerHTML` UI construction.

## Dependencies

- Firefox desktop and `web-ext`.
- Existing `pointa-server` package and local port 4242 workflow.
- Mozilla AMO account and signing credentials when packaging for distribution.
- Product decision on release channel and parity bar.

## Approval Notes

Approved planning conclusion: proceed with a full Firefox build plan that starts
with package and runtime compatibility, then builds core annotation parity,
element-linked screenshots, Firefox-supported evidence capture, QA, and release
readiness.
