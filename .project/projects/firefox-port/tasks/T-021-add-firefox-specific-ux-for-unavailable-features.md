---
id: T-021
name: Add Firefox-specific UX for unavailable features
status: done
workstream: WS-005
created: 2026-05-29T19:26:28Z
updated: 2026-05-29T20:14:10Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-020]
conflicts_with: []
parallel: true
priority: medium
estimate: M
story_id: US-003
acceptance_criteria_ids: [AC-004]
---

# Task: Add Firefox-specific UX for unavailable features

## Description

Add UI states or copy for Firefox features that are degraded compared with Chrome.

## Acceptance Criteria

- [x] Firefox users are not shown controls that cannot work.
- [x] Degraded feature messages explain the limitation without mentioning internal CDP jargon.
- [x] Chrome users do not see Firefox-specific degradation copy.

## Traceability
- Story: US-003
- Acceptance criteria: AC-004

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-05-29T20:14:10Z: Capability smoke passed for Firefox/no-debugger hidden responsive controls and Chrome/debugger visible controls; node --check passed for inspiration-mode/background; npm run firefox:lint exits 0 with known warning baseline; docs/FIREFOX_EVIDENCE_CAPTURE.md records Firefox UX rules.

- 2026-05-29T20:11:48Z: Adding capability-aware degraded-state UX for Firefox-only limitations

- 2026-05-29T20:11:42Z: T-020 is done; Firefox degraded-state UX is unblocked
- 2026-05-29T19:26:28Z: Created from .project/templates/task.md by `delano task add`.
