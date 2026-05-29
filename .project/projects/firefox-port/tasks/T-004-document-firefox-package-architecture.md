---
id: T-004
name: Document Firefox package architecture
status: done
workstream: WS-001
created: 2026-05-29T19:26:26Z
updated: 2026-05-29T19:35:19Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-001, T-002]
conflicts_with: []
parallel: true
priority: medium
estimate: S
story_id: US-002
acceptance_criteria_ids: [AC-005]
---

# Task: Document Firefox package architecture

## Description

Document how the Chrome and Firefox extension packages are generated and where browser-specific differences belong.

## Acceptance Criteria

- [x] Documentation names the source directory, generated Firefox output, and release artifact path.
- [x] Documentation states that Chrome manifest behavior must remain untouched unless Chrome validation is run.
- [x] Documentation explains how Firefox manifest fields are sourced and updated.

## Traceability
- Story: US-002
- Acceptance criteria: AC-005

## Technical Notes

## Definition of Done
- [ ] Implementation complete
- [ ] Tests pass
- [ ] Review complete
- [ ] Docs updated

## Evidence Log

- 2026-05-29T19:35:19Z: Added docs/FIREFOX_PORT.md documenting shared source, Chrome manifest, Firefox build script, dist/firefox output, dist/firefox-artifacts package path, manifest transformation behavior, and warning baseline; docs/DEVELOPMENT.md links to the Firefox port doc.

- 2026-05-29T19:35:11Z: Document Firefox package architecture after build tooling

- 2026-05-29T19:34:34Z: Dependencies T-001 and T-002 are done; package architecture documentation task is ready
- 2026-05-29T19:26:26Z: Created from .project/templates/task.md by `delano task add`.
