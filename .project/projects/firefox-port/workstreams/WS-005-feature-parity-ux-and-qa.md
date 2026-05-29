---
id: WS-005
name: WS-005 Feature Parity UX and QA
owner: qa-team
status: done
created: 2026-05-29T19:25:23Z
updated: 2026-05-29T21:47:38Z
---

# Workstream: WS-005 Feature Parity UX and QA

## Objective
Make Firefox behavior understandable and testable: add UX for unavailable or
degraded features, define manual QA, run the Firefox demo smoke path, regression
check Chrome, and audit AMO linter warnings that affect release readiness.

## Owned Files/Areas
- Firefox-specific UI/copy in content modules and toolbar/sidebar panels
- `testing/demo-app/index.html`
- `testing/fixtures/demo/`
- `docs/DEVELOPMENT.md` or QA docs
- Chrome regression smoke notes
- AMO warning audit notes
- Delano tasks T-021 through T-025

## Dependencies
- WS-003 annotation/screenshot flow
- WS-004 evidence parity mapping
- WS-001 web-ext tooling

## Risks
- Firefox-specific copy could leak into Chrome.
- QA may miss background service worker or permission edge cases.
- AMO `innerHTML` warnings may become release blockers.

## Handoff Criteria
- Firefox unavailable/degraded states are user-visible and non-crashing.
- Manual QA matrix covers core annotation, screenshots, evidence capture,
  offline behavior, and degraded features.
- Firefox demo smoke evidence and Chrome regression evidence are recorded.
- AMO `innerHTML` warnings have disposition before release decision.
