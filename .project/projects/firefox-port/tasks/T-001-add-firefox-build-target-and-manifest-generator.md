---
id: T-001
name: Add Firefox build target and manifest generator
status: done
workstream: WS-001
created: 2026-05-29T19:26:26Z
updated: 2026-05-29T19:32:05Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: []
conflicts_with: []
parallel: true
priority: high
estimate: M
story_id: US-002
acceptance_criteria_ids: [AC-001, AC-005]
---

# Task: Add Firefox build target and manifest generator

## Description

Create a repeatable build path that copies shared extension assets into a Firefox-specific output and writes a Firefox-compatible manifest.

## Acceptance Criteria

- [x] A command generates dist/firefox from the shared extension source.
- [x] The Firefox manifest includes Gecko browser_specific_settings, data collection declaration, and compatible background configuration.
- [x] The Firefox manifest omits unsupported debugger permission while leaving the Chrome manifest unchanged.

## Traceability
- Story: US-002
- Acceptance criteria: AC-001, AC-005

## Technical Notes

## Definition of Done
- [ ] Implementation complete
- [ ] Tests pass
- [ ] Review complete
- [ ] Docs updated

## Evidence Log

- 2026-05-29T19:32:05Z: Implemented scripts/build-firefox-extension.js; command node scripts/build-firefox-extension.js generates dist/firefox; generated Firefox manifest includes browser_specific_settings.gecko, data_collection_permissions, background.scripts, and omits debugger while extension/manifest.json remains unchanged; npx --yes web-ext lint --source-dir dist/firefox --output json exits with 0 errors.

- 2026-05-29T19:30:32Z: Begin Firefox package build target implementation
- 2026-05-29T19:26:26Z: Created from .project/templates/task.md by `delano task add`.
