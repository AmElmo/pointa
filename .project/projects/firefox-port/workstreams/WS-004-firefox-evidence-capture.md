---
id: WS-004
name: WS-004 Firefox Evidence Capture
owner: extension-team
status: done
created: 2026-05-29T19:25:23Z
updated: 2026-05-29T20:10:46Z
---

# Workstream: WS-004 Firefox Evidence Capture

## Objective
Replace Chrome CDP issue-report evidence with the richest Firefox-supported
model: page console instrumentation, page errors, unhandled rejections, network
metadata/failures, backend logs, screenshots, and a documented parity matrix.

## Owned Files/Areas
- `extension/background/background.js`
- `extension/content/modules/bug-recorder.js`
- `extension/content/modules/performance-recorder.js`
- `extension/content/modules/bug-report-ui.js`
- `extension/content/modules/performance-report-ui.js`
- Page instrumentation code or injected script assets
- `annotations-server/lib/server.js` backend log APIs as needed
- Delano tasks T-015 through T-020

## Dependencies
- WS-002 debugger/CDP guards
- WS-003 screenshot attachment path
- Firefox `scripting` main-world or equivalent page instrumentation support
- Firefox `webRequest` permission decision

## Risks
- Firefox cannot provide exact Chrome CDP parity.
- Main-world instrumentation can miss early logs if not installed soon enough.
- `webRequest` adds permission and privacy review cost.
- Network response bodies should not be promised unless supported by a proven
  implementation.

## Handoff Criteria
- Firefox issue reports can include supported console, error, network, backend,
  and screenshot evidence.
- Unsupported CDP-only evidence is mapped and surfaced as degraded/unavailable.
- Permission and privacy impacts are documented before release planning.
