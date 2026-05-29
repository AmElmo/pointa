---
id: T-020
name: Map Firefox evidence parity and degraded states
status: done
workstream: WS-004
created: 2026-05-29T19:26:28Z
updated: 2026-05-29T20:10:46Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-017, T-018, T-019]
conflicts_with: []
parallel: true
priority: medium
estimate: S
story_id: US-003
acceptance_criteria_ids: [AC-004, AC-006]
---

# Task: Map Firefox evidence parity and degraded states

## Description

Classify each Chrome evidence feature as parity, approximate, or unavailable in Firefox.

## Acceptance Criteria

- [x] A parity matrix covers screenshots, console logs, runtime errors, network events, backend logs, and responsive capture.
- [x] Unavailable features have user-facing labels and implementation notes.
- [x] The matrix is referenced by QA and release documentation.

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

- 2026-05-29T20:10:46Z: Expanded docs/FIREFOX_EVIDENCE_CAPTURE.md with Available/Approximate/Unavailable labels and a parity matrix covering visible and element screenshots, console methods, runtime errors, promise rejections, network metadata, network response bodies, backend logs, and responsive viewport capture. Linked the matrix from Firefox port and release docs for QA/release consistency. Verified git diff --check on updated docs.

- 2026-05-29T20:10:09Z: Updating Firefox evidence parity and degraded-state documentation

- 2026-05-29T20:10:06Z: Dependencies T-017, T-018, and T-019 are done; evidence parity mapping is unblocked
- 2026-05-29T19:26:28Z: Created from .project/templates/task.md by `delano task add`.
