---
id: T-015
name: Design Firefox evidence capture model
status: done
workstream: WS-004
created: 2026-05-29T19:26:27Z
updated: 2026-05-29T19:39:40Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-008]
conflicts_with: []
parallel: true
priority: high
estimate: M
story_id: US-003
acceptance_criteria_ids: [AC-004, AC-006]
---

# Task: Design Firefox evidence capture model

## Description

Define the supported Firefox replacement for CDP issue timelines using page instrumentation, webRequest, and backend logs.

## Acceptance Criteria

- [x] Design document states which event types Firefox will capture.
- [x] Design document states which Chrome CDP events cannot be matched exactly.
- [x] Permission and privacy impacts are listed for each evidence source.

## Traceability
- Story: US-003
- Acceptance criteria: AC-004, AC-006

## Technical Notes

## Definition of Done
- [ ] Implementation complete
- [ ] Tests pass
- [ ] Review complete
- [ ] Docs updated

## Evidence Log

- 2026-05-29T19:39:40Z: Added docs/FIREFOX_EVIDENCE_CAPTURE.md covering Firefox event sources, console/error/rejection/network/backend/screenshot event types, CDP gaps, parity matrix, and permission/privacy impacts; linked it from docs/FIREFOX_PORT.md.

- 2026-05-29T19:39:15Z: Design Firefox-supported replacement for CDP evidence capture

- 2026-05-29T19:39:15Z: Dependency T-008 is done; Firefox evidence capture design task is ready
- 2026-05-29T19:26:27Z: Created from .project/templates/task.md by `delano task add`.
