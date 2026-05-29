---
id: T-017
name: Capture page errors and unhandled rejections
status: done
workstream: WS-004
created: 2026-05-29T19:26:27Z
updated: 2026-05-29T20:08:36Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-016]
conflicts_with: []
parallel: true
priority: high
estimate: M
story_id: US-003
acceptance_criteria_ids: [AC-004, AC-006]
---

# Task: Capture page errors and unhandled rejections

## Description

Record window error and unhandled promise rejection events into Pointa issue reports in Firefox.

## Acceptance Criteria

- [x] Runtime exceptions during recording appear in the issue timeline.
- [x] Unhandled promise rejections during recording appear in the issue timeline.
- [x] Captured events include source location when Firefox exposes it.

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

- 2026-05-29T20:08:36Z: Extended packaged MAIN-world recorder to listen for runtime error and unhandledrejection events while recording, forwarding them as console-error timeline entries with subtypes page-error/unhandled-rejection and source location fields when available. Verified node --check on recorder/bug-recorder/background, VM smoke for page error and rejection capture, git diff --check, and npm run firefox:lint exits 0.

- 2026-05-29T20:07:16Z: Extending Firefox page instrumentation to runtime exceptions and unhandled rejections

- 2026-05-29T20:06:53Z: Dependency T-016 is done; Firefox page error capture is unblocked
- 2026-05-29T19:26:27Z: Created from .project/templates/task.md by `delano task add`.
