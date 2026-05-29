---
id: T-006
name: Adapt background lifecycle and injection for Firefox
status: done
workstream: WS-002
created: 2026-05-29T19:26:26Z
updated: 2026-05-29T19:50:52Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-005]
conflicts_with: []
parallel: true
priority: high
estimate: M
story_id: US-001
acceptance_criteria_ids: [AC-002]
---

# Task: Adapt background lifecycle and injection for Firefox

## Description

Make background startup, action handling, content CSS insertion, and ordered module injection work in Firefox.

## Acceptance Criteria

- [x] Opening the Pointa action in Firefox injects the content CSS and modules on a supported localhost page.
- [x] Repeated action clicks do not duplicate content scripts or break existing injection locks.
- [x] Unsupported pages fail gracefully without noisy user-facing errors.

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

- 2026-05-29T19:50:52Z: Adapted action click and ordered injection for Firefox: unsupported page schemes are skipped quietly, content CSS/modules inject in fixed order, one in-flight injection per tab is reused, per-file markers make retries idempotent, and Firefox background runtime is documented. Verified node --check on background/common helpers, npm run firefox:lint exits 0, and npm run firefox:package produces dist/firefox-artifacts/pointa-1.3.6.zip.

- 2026-05-29T19:46:57Z: Adapting Firefox background action handling and ordered content injection

- 2026-05-29T19:38:17Z: Dependency T-005 is done; Firefox background/injection task is ready
- 2026-05-29T19:26:26Z: Created from .project/templates/task.md by `delano task add`.
