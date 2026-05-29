---
id: T-019
name: Preserve backend log capture for Firefox issue reports
status: done
workstream: WS-004
created: 2026-05-29T19:26:27Z
updated: 2026-05-29T20:09:44Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-007, T-017]
conflicts_with: []
parallel: true
priority: medium
estimate: M
story_id: US-003
acceptance_criteria_ids: [AC-004, AC-006]
---

# Task: Preserve backend log capture for Firefox issue reports

## Description

Ensure existing pointa-server dev backend log capture can be included in Firefox issue timelines.

## Acceptance Criteria

- [x] Firefox UI can show backend log capture status from the local server.
- [x] Starting and stopping backend log recording works from Firefox flows.
- [x] Backend log events are included in saved issue reports when available.

## Traceability
- Story: US-003
- Acceptance criteria: AC-004, AC-006

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-05-29T20:09:44Z: Verified Firefox uses the same local pointa-server backend log endpoints and existing UI flow: toolbar checks getBackendLogStatus, BugRecorder starts/stops backend log recording when enabled, and returned logs are transformed into backend-* timeline events. VM smoke confirmed status/start/stop endpoint use and captureStdout payload; node --check passed for background, bug recorder, and toolbar panels.

- 2026-05-29T20:09:18Z: Verifying backend log capture path works under Firefox-compatible runtime

- 2026-05-29T20:09:01Z: Dependencies T-007 and T-017 are done; backend log capture verification is unblocked
- 2026-05-29T19:26:27Z: Created from .project/templates/task.md by `delano task add`.
