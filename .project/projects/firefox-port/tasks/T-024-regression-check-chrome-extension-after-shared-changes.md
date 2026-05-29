---
id: T-024
name: Regression check Chrome extension after shared changes
status: deferred
workstream: WS-005
created: 2026-05-29T19:26:28Z
updated: 2026-05-29T21:48:13Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-023]
conflicts_with: []
parallel: true
priority: high
estimate: M
story_id: US-002
acceptance_criteria_ids: [AC-002, AC-003, AC-004]
---

# Task: Regression check Chrome extension after shared changes

## Description

Verify shared code changes did not break the existing Chrome extension package and core flows.

## Acceptance Criteria

- [ ] Chrome extension manifest remains valid for current release path.
- [ ] Chrome annotation and screenshot flows still work on a localhost page.
- [ ] Chrome CDP-dependent features still work or any regression is filed as a blocker.

## Traceability
- Story: US-002
- Acceptance criteria: AC-002, AC-003, AC-004

## Technical Notes

## Definition of Done
- [ ] Implementation complete
- [ ] Tests pass
- [ ] Review complete
- [ ] Docs updated

## Evidence Log

- 2026-05-29T21:48:13Z: Chrome regression closeout check: source manifest parses as MV3 with activeTab/storage/tabs/debugger/scripting and local host permissions; automated temporary-profile smoke could not load the unpacked extension because this Google Chrome build logs '--load-extension is not allowed in Google Chrome, ignoring.' Full annotation/screenshot/CDP regression therefore remains a manual/alternate-runtime public-release gate.

- 2026-05-29T21:47:38Z: Deferred rather than marked done: Chrome manifest/static compatibility checks are clean, but a full real Chrome annotation/screenshot/CDP interactive regression pass was not completed in this closeout. Public release gate in docs/FIREFOX_RELEASE_READINESS.md requires this pass before listed release.
- 2026-05-29T19:26:28Z: Created from .project/templates/task.md by `delano task add`.
