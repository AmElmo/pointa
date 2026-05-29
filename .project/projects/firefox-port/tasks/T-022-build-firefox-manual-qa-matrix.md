---
id: T-022
name: Build Firefox manual QA matrix
status: done
workstream: WS-005
created: 2026-05-29T19:26:28Z
updated: 2026-05-29T20:28:56Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-010, T-012, T-020]
conflicts_with: []
parallel: true
priority: medium
estimate: S
story_id: US-004
acceptance_criteria_ids: [AC-001, AC-002, AC-003, AC-004, AC-006]
---

# Task: Build Firefox manual QA matrix

## Description

Create a manual QA checklist for Firefox demo, annotation, screenshot, evidence capture, offline, and permission states.

## Acceptance Criteria

- [x] QA matrix lists setup commands, browser version, server state, and demo URL.
- [x] QA matrix covers annotation, screenshots, console/error capture, network/backend logs, and degraded features.
- [x] QA matrix records expected pass/fail evidence for each scenario.

## Traceability
- Story: US-004
- Acceptance criteria: AC-001, AC-002, AC-003, AC-004, AC-006

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-05-29T20:28:56Z: docs/FIREFOX_QA_MATRIX.md created with setup commands, Firefox version/server/demo URL run-record slots, and manual scenarios for annotation CRUD, relinking, screenshots, MCP image payloads, console/errors/rejections, network/backend logs, offline/restricted/permission states, design/inspiration flows, degraded responsive capture, and AMO warning touchpoints. git diff --check passed.

- 2026-05-29T20:25:31Z: T-010, T-012, and T-020 are done; building Firefox manual QA matrix.
- 2026-05-29T19:26:28Z: Created from .project/templates/task.md by `delano task add`.
