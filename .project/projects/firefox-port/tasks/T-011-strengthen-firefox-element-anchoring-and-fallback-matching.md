---
id: T-011
name: Strengthen Firefox element anchoring and fallback matching
status: done
workstream: WS-003
created: 2026-05-29T19:26:27Z
updated: 2026-05-29T20:00:48Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-010]
conflicts_with: []
parallel: true
priority: high
estimate: M
story_id: US-001
acceptance_criteria_ids: [AC-002]
---

# Task: Strengthen Firefox element anchoring and fallback matching

## Description

Ensure annotations remain linked to the intended element using selectors, stable attributes, text samples, geometry, and parent context.

## Acceptance Criteria

- [x] Saved annotations include enough element context to retry matching after DOM changes.
- [x] Fallback matching prefers stable id/data attributes before brittle nth-child selectors.
- [x] A changed demo DOM still resolves at least one intentionally shifted annotated element.

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

- 2026-05-29T20:00:48Z: Saved annotations now carry stable attributes, sibling indexes, parent context, text, and geometry; selector generation prioritizes id/data/ARIA/name/type/role/href/alt/title before class/position fallbacks and no longer emits synthetic data-text-content selectors; element matching tries stable attributes before text/class/position. Verified node --check on touched content modules, git diff --check, and npm run firefox:lint exits 0.

- 2026-05-29T19:56:17Z: Strengthening element context and fallback matching for Firefox annotations

- 2026-05-29T19:56:08Z: Dependency T-010 is done; Firefox element anchoring work is unblocked
- 2026-05-29T19:26:27Z: Created from .project/templates/task.md by `delano task add`.
