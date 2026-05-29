---
id: T-028
name: Prepare Firefox privacy and data collection declaration
status: done
workstream: WS-006
created: 2026-05-29T19:26:28Z
updated: 2026-05-29T20:28:05Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-025, T-026]
conflicts_with: []
parallel: true
priority: medium
estimate: M
story_id: US-004
acceptance_criteria_ids: [AC-005]
---

# Task: Prepare Firefox privacy and data collection declaration

## Description

Prepare manifest data collection settings and release checklist content for Firefox privacy review.

## Acceptance Criteria

- [x] Firefox manifest data collection permissions match actual local-first behavior.
- [x] Privacy/release notes explain screenshots, annotations, logs, and local storage.
- [x] Any Linear or AI-tool integration data handling is explicitly documented.

## Traceability
- Story: US-004
- Acceptance criteria: AC-005

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-05-29T20:28:05Z: docs/FIREFOX_PRIVACY_DECLARATION.md documents manifest data_collection_permissions, local-first storage, screenshots/annotations/logs, MCP AI-tool handling, and optional Linear export/fetch behavior. docs/FIREFOX_RELEASE.md and docs/FIREFOX_PORT.md link the declaration. npm run firefox:build passed; manifest smoke confirmed required websiteActivity/websiteContent, optional=[], and Firefox permissions activeTab/storage/scripting only.

- 2026-05-29T20:26:55Z: T-025 and T-026 are done; preparing Firefox privacy/data collection declaration.
- 2026-05-29T19:26:28Z: Created from .project/templates/task.md by `delano task add`.
