---
id: T-025
name: Audit AMO innerHTML warnings
status: done
workstream: WS-005
created: 2026-05-29T19:26:28Z
updated: 2026-05-29T20:22:51Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-021]
conflicts_with: []
parallel: true
priority: medium
estimate: L
story_id: US-004
acceptance_criteria_ids: [AC-005]
---

# Task: Audit AMO innerHTML warnings

## Description

Review web-ext unsafe innerHTML warnings and refactor or document each risk before Firefox submission.

## Acceptance Criteria

- [x] Each web-ext innerHTML warning has a disposition: refactored, escaped, safe static template, or deferred blocker.
- [x] User-provided strings in affected paths are escaped or assigned as text.
- [x] Remaining warnings are acceptable for internal builds or marked as release blockers.

## Traceability
- Story: US-004
- Acceptance criteria: AC-005

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-05-29T20:22:51Z: docs/FIREFOX_AMO_INNERHTML_AUDIT.md records all 26 UNSAFE_VAR_ASSIGNMENT warning dispositions and release blockers. Added targeted hardening for annotation selectors/comments, replay error/step strings, report IDs, resource/timeline strings, and shared escape helpers. node --check passed for touched JS; git diff --check passed; npm run firefox:lint exits 0 with 46 known warnings.

- 2026-05-29T20:16:29Z: T-021 is done; auditing AMO innerHTML warning baseline while screenshot attachment work continues in parallel.
- 2026-05-29T19:26:28Z: Created from .project/templates/task.md by `delano task add`.
