---
id: T-002
name: Add web-ext tooling and Firefox scripts
status: done
workstream: WS-001
created: 2026-05-29T19:26:26Z
updated: 2026-05-29T19:34:09Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-001]
conflicts_with: []
parallel: true
priority: high
estimate: S
story_id: US-002
acceptance_criteria_ids: [AC-001]
---

# Task: Add web-ext tooling and Firefox scripts

## Description

Add package scripts and tool configuration for Firefox linting, local running, and packaging.

## Acceptance Criteria

- [x] Repository scripts expose Firefox build, lint, run, and package commands.
- [x] web-ext runs against the generated Firefox output directory.
- [x] Tooling changes are documented in the project plan or developer docs.

## Traceability
- Story: US-002
- Acceptance criteria: AC-001

## Technical Notes

## Definition of Done
- [ ] Implementation complete
- [ ] Tests pass
- [ ] Review complete
- [ ] Docs updated

## Evidence Log

- 2026-05-29T19:34:09Z: Added root scripts firefox:build, firefox:lint, firefox:run, and firefox:package; documented Firefox development workflow in docs/DEVELOPMENT.md; npm run firefox:build succeeds; npm run firefox:lint runs web-ext against dist/firefox and exits with 0 errors; npm run firefox:package creates dist/firefox-artifacts/pointa-1.3.6.zip.

- 2026-05-29T19:33:15Z: Begin Firefox web-ext tooling scripts and documentation

- 2026-05-29T19:32:42Z: Dependency T-001 is done; Firefox tooling task is ready
- 2026-05-29T19:26:26Z: Created from .project/templates/task.md by `delano task add`.
