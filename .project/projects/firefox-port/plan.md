---
name: Firefox Extension Port
status: done
lead: team
created: 2026-05-29T19:06:15Z
updated: 2026-05-29T21:48:19Z
linear_project_id: 
risk_level: high
spec_status_at_plan_time: planned
---

# Delivery Plan: Firefox Extension Port

## What Changed After Probe

Research found that Firefox can support Pointa's core local-first extension
workflow, but not the Chrome DevTools Protocol portions. The plan now treats the
port as a browser-specific packaging, runtime compatibility, annotation parity,
evidence-capture replacement, QA, and release-readiness project.

## Technical Context

- Current extension is Manifest V3 with `background.service_worker`, `action`,
  `activeTab`, `storage`, `tabs`, `debugger`, and `scripting`.
- Current background script uses `chrome.scripting` to inject ordered content
  modules dynamically.
- Current local server endpoint is hardcoded as `http://127.0.0.1:4242` in the
  background script and in a few content fallback paths.
- Current CDP paths use `chrome.debugger` for viewport emulation, CDP screenshot
  capture, network recording, log recording, and runtime console recording.
- Firefox tooling baseline from `web-ext lint` against current `extension/`:
  2 errors, 43 warnings.

## Architecture Decisions

- Generate a Firefox-specific package from shared extension sources.
- Keep the current Chrome package shape intact.
- Add browser capability checks before debugger-dependent calls.
- Replace CDP-only features with Firefox-supported alternatives where practical;
  otherwise degrade explicitly.
- Make `web-ext lint` a required validation gate for the Firefox package.
- Build the most complete Firefox-supported evidence model rather than waiting
  for exact CDP parity.

## Policy and Contract Checks
- [x] `.project` remains the execution source of truth
- [x] Probe decision is explicit
- [x] Evidence gates are defined before handoff
- [x] External sync writes require dry-run or operator approval

## Generated Artifact Map
- `spec.md`: Created by `delano project create`, then updated from
  `research/firefox-extension-port/findings.md`.
- `plan.md`: Created by `delano project create`, then updated from
  `research/firefox-extension-port/findings.md`.
- `decisions.md`: Created by `delano project create`, then updated from
  `research/firefox-extension-port/findings.md`.
- `workstreams/`: Created with `delano workstream add` for WS-001 through WS-006.
- `tasks/`: Created with `delano task add` for T-001 through T-029.

## Complexity Exceptions
- CDP parity is the only high-complexity exception. Firefox lacks the Chrome
  `debugger` API, so full parity requires product and architecture decisions
  rather than mechanical API renaming.

## Probe-Driven Architecture Changes

- Add a manifest generation step, for example `extension/manifest.firefox.json`
  or a script that writes `dist/firefox/manifest.json`.
- Firefox manifest requirements:
  - include `background.scripts` fallback or Firefox-compatible background form;
  - include `browser_specific_settings.gecko.id`;
  - include `browser_specific_settings.gecko.data_collection_permissions`;
  - omit unsupported `debugger` permission;
  - consider a `strict_min_version` after selecting the target Firefox channel.
- Add a runtime capability helper for browser/API detection.
- Route screenshot capture through `tabs.captureVisibleTab` for Firefox.
- Disable or replace viewport emulation in Firefox.
- Replace CDP bug/performance network capture with `webRequest` observation if
  the added permission is acceptable.
- Replace CDP console/runtime capture with main-world page instrumentation where
  feasible; otherwise capture only content-script-visible errors and backend logs.

## Workstream Design

- WS-001 Firefox Packaging Baseline: manifest generation, Gecko ID/data
  collection keys, permission cleanup, web-ext scripts, lint gate, and package
  architecture docs.
- WS-002 Cross-Browser Runtime Compatibility: API namespace/capability helper,
  background lifecycle compatibility, injection verification, local API health
  checks, debugger guards, and Firefox permission scope.
- WS-003 Annotation Element Anchoring and Screenshots: annotation CRUD,
  element-link resilience, visible-tab and element screenshot attachments, image
  storage/MCP payload verification, and design/inspiration compatibility.
- WS-004 Firefox Evidence Capture: console instrumentation, page errors,
  unhandled rejections, network metadata/failures, backend logs, and evidence
  parity/degraded-state mapping.
- WS-005 Feature Parity UX and QA: Firefox-specific unavailable-feature UX,
  manual QA matrix, web-ext demo smoke test, Chrome regression check, and AMO
  `innerHTML` warning audit.
- WS-006 Firefox Release and Documentation: signing/distribution decision, user
  and developer docs, privacy/data collection declaration, and release readiness
  report.

## Milestone Strategy

- M1: Firefox package lints with zero errors.
- M2: Firefox loads with `web-ext run`, injects Pointa UI on localhost, and
  connects to `pointa-server`.
- M3: Core annotation, element anchoring, screenshot attachment, image storage,
  and MCP image retrieval work end to end.
- M4: Firefox-supported evidence capture records console logs, page errors,
  unhandled rejections, network metadata/failures, backend logs, and degraded
  states for unsupported CDP-only behavior.
- M5: Firefox-specific UX, manual QA, Chrome regression checks, AMO risk audit,
  docs, privacy declaration, signing path, and release readiness report are
  complete.

## Rollout Strategy

- Keep Firefox behind a separate package/build target until lint and manual smoke
  tests pass.
- Ship internal/test XPI first.
- Decide listed AMO versus self-distributed signed release after MVP validation.
- Do not promote Firefox parity until CDP-dependent feature behavior is clearly
  documented.

## Test Strategy

- `web-ext lint --source-dir dist/firefox`
- `web-ext run --source-dir dist/firefox`
- Start server with `cd annotations-server && npm run dev` or
  `npx pointa-server start`.
- Smoke on `http://localhost:8080/testing/demo-app/index.html` after
  `scripts/load-demo.sh`.
- Verify extension popup/action, sidebar/toolbar injection, annotation create,
  annotation list, element re-linking, screenshot capture, image upload/MCP
  retrieval, settings/onboarding, and server offline behavior.
- Verify console log, page error, unhandled rejection, network failure, backend
  log, and screenshot evidence capture where supported.
- Verify CDP-only controls are hidden, disabled, or replaced in Firefox.
- Regression-check Chrome after shared runtime changes.
- Run `delano validate` after Delano artifacts change.

## Rollback Strategy

- Firefox work must not change the Chrome manifest or Chrome release path without
  separate validation.
- If Firefox feature parity blocks release, keep Firefox build target internal and
  ship only documentation or a limited MVP decision record.
- If generated packaging introduces regressions, remove the Firefox build script
  and leave shared extension source untouched.

## Remaining Delivery Risks

- Full CDP timeline parity may be impossible with standard Firefox extension APIs.
- AMO review may require dynamic HTML construction cleanup.
- Host permission prompts may reduce install conversion unless scoped and
  explained well.
- Firefox Android support may require a separate project after desktop MVP.
