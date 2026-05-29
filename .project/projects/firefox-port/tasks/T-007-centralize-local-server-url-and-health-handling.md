---
id: T-007
name: Centralize local server URL and health handling
status: done
workstream: WS-002
created: 2026-05-29T19:26:26Z
updated: 2026-05-29T19:45:49Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-005]
conflicts_with: []
parallel: true
priority: medium
estimate: S
story_id: US-001
acceptance_criteria_ids: [AC-002]
---

# Task: Centralize local server URL and health handling

## Description

Remove scattered local server URL assumptions by routing health and API calls through shared configuration or helper methods.

## Acceptance Criteria

- [x] Firefox and Chrome use the same canonical local server URL source.
- [x] Server offline state is reported consistently in popup/sidebar flows.
- [x] No new cloud or remote dependency is introduced.

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

- 2026-05-29T19:45:49Z: Added extension/common/browser-compat.js local-server helpers and routed background/content health, API fallback, toolbar/sidebar, upload/image, onboarding MCP URL, and Pointa-owned request filtering through them. Verified node --check on touched JS, npm run firefox:lint exits 0, and hardcoded URL scan leaves only the canonical helper literal.

- 2026-05-29T19:45:42Z: Centralizing local server URL and health handling across background/content surfaces

- 2026-05-29T19:38:17Z: Dependency T-005 is done; local server URL centralization task is ready
- 2026-05-29T19:26:26Z: Created from .project/templates/task.md by `delano task add`.
