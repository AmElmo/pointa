---
id: T-027
name: Update Firefox user and developer docs
status: done
workstream: WS-006
created: 2026-05-29T19:26:28Z
updated: 2026-05-29T20:17:27Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-021, T-026]
conflicts_with: []
parallel: true
priority: medium
estimate: M
story_id: US-001
acceptance_criteria_ids: [AC-002, AC-004, AC-005]
---

# Task: Update Firefox user and developer docs

## Description

Document Firefox install, local server setup, supported features, limitations, and development workflow.

## Acceptance Criteria

- [x] README or docs include Firefox setup for users.
- [x] Developer docs include web-ext build, run, lint, and package commands.
- [x] Docs describe Firefox-specific limitations for responsive capture and evidence logs.

## Traceability
- Story: US-001
- Acceptance criteria: AC-002, AC-004, AC-005

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-05-29T20:17:27Z: README now documents local Firefox temporary add-on setup; docs/DEVELOPMENT.md and docs/FIREFOX_PORT.md document build/run/lint/package commands, local install workflow, and Firefox evidence/responsive-capture limitations. git diff --check passed for updated docs; npm run firefox:lint previously exited 0 after T-021 code validation.

- 2026-05-29T20:16:48Z: T-021 and T-026 are done; updating Firefox install/development docs while AMO warning audit runs separately.
- 2026-05-29T19:26:28Z: Created from .project/templates/task.md by `delano task add`.
