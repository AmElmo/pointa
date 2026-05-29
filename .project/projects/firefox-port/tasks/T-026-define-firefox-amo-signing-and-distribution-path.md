---
id: T-026
name: Define Firefox AMO signing and distribution path
status: done
workstream: WS-006
created: 2026-05-29T19:26:28Z
updated: 2026-05-29T19:42:13Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-003]
conflicts_with: []
parallel: true
priority: medium
estimate: M
story_id: US-004
acceptance_criteria_ids: [AC-005]
---

# Task: Define Firefox AMO signing and distribution path

## Description

Choose and document listed AMO, unlisted signed XPI, or both for Firefox distribution.

## Acceptance Criteria

- [x] Distribution decision names the target channel and required credentials.
- [x] Signing command and artifact path are documented.
- [x] Release blockers for AMO submission are listed.

## Traceability
- Story: US-004
- Acceptance criteria: AC-005

## Technical Notes

## Definition of Done
- [ ] Implementation complete
- [ ] Tests pass
- [ ] Review complete
- [ ] Docs updated

## Evidence Log

- 2026-05-29T19:42:13Z: Added docs/FIREFOX_RELEASE.md documenting internal/beta-first distribution decision, required AMO credentials, build/lint/package commands, unsigned artifact path, signing approach, release blockers, and public listing notes; linked from docs/FIREFOX_PORT.md.

- 2026-05-29T19:41:54Z: Document Firefox AMO signing and distribution path

- 2026-05-29T19:41:54Z: Dependency T-003 is done; Firefox signing/distribution planning is ready
- 2026-05-29T19:26:28Z: Created from .project/templates/task.md by `delano task add`.
