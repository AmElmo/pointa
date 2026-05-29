---
id: T-029
name: Create Firefox release readiness report
status: deferred
workstream: WS-006
created: 2026-05-29T19:26:28Z
updated: 2026-05-29T21:48:19Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-023, T-024, T-028]
conflicts_with: []
parallel: true
priority: medium
estimate: M
story_id: US-004
acceptance_criteria_ids: [AC-001, AC-002, AC-003, AC-004, AC-005, AC-006]
---

# Task: Create Firefox release readiness report

## Description

Summarize implementation evidence, validation, remaining gaps, and the release decision for Firefox.

## Acceptance Criteria

- [ ] Report includes web-ext lint, web-ext run, manual QA, Chrome regression, and known limitations.
- [ ] Report recommends release, internal beta, or defer with rationale.
- [ ] Delano project artifacts are updated with final evidence and remaining risks.

## Traceability
- Story: US-004
- Acceptance criteria: AC-001, AC-002, AC-003, AC-004, AC-005, AC-006

## Technical Notes

## Definition of Done
- [ ] Implementation complete
- [ ] Tests pass
- [ ] Review complete
- [ ] Docs updated

## Evidence Log

- 2026-05-29T21:48:19Z: Deferred public-release closeout because dependency T-024 is deferred: this Google Chrome build rejects --load-extension, so the full Chrome annotation/screenshot/CDP regression pass remains a manual or alternate-runtime gate. docs/FIREFOX_RELEASE_READINESS.md records the internal-beta-ready decision and public-release blockers.

- 2026-05-29T21:48:16Z: Created docs/FIREFOX_RELEASE_READINESS.md with Firefox lint/package/Delano validation evidence, Zen annotation screenshot evidence, permission rationale, known limitations, remaining risks, and release decision. Task cannot close because dependency T-024 is deferred by Chrome runtime policy; readiness report therefore recommends internal beta and defers public listed release.
- 2026-05-29T19:26:28Z: Created from .project/templates/task.md by `delano task add`.
