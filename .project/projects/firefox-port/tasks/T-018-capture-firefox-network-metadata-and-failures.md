---
id: T-018
name: Capture Firefox network metadata and failures
status: done
workstream: WS-004
created: 2026-05-29T19:26:27Z
updated: 2026-05-29T20:04:01Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-015]
conflicts_with: []
parallel: true
priority: high
estimate: L
story_id: US-003
acceptance_criteria_ids: [AC-004, AC-006]
---

# Task: Capture Firefox network metadata and failures

## Description

Prototype Firefox network evidence using webRequest and/or page fetch/XHR instrumentation without CDP.

## Acceptance Criteria

- [x] Failed requests during recording appear in the issue timeline.
- [x] Captured request metadata includes URL, method, status or failure reason when available.
- [x] Response body capture is not promised unless a supported implementation exists.

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

- 2026-05-29T20:04:01Z: Added Firefox-safe page network metadata fallback: a packaged MAIN-world recorder injected through scripting.executeScript wraps fetch/XMLHttpRequest during recording, buffers URL/method/status/error metadata, restores original APIs on stop, and merges with CDP network events with duplicate filtering. Response body capture is explicitly not promised. Verified node --check on bug recorder/page recorder/background, a VM smoke confirmed failed fetch capture and restore, and npm run firefox:lint exits 0.

- 2026-05-29T20:03:52Z: Integrating Firefox network metadata fallback completed by worker

- 2026-05-29T19:51:39Z: Dependency T-015 is done; Firefox network metadata capture is unblocked
- 2026-05-29T19:26:27Z: Created from .project/templates/task.md by `delano task add`.
