---
id: T-016
name: Inject page console instrumentation in Firefox
status: done
workstream: WS-004
created: 2026-05-29T19:26:27Z
updated: 2026-05-29T20:06:38Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-006, T-015]
conflicts_with: []
parallel: true
priority: high
estimate: L
story_id: US-003
acceptance_criteria_ids: [AC-004, AC-006]
---

# Task: Inject page console instrumentation in Firefox

## Description

Inject a Firefox-safe main-world script to observe console methods and forward events to the content script while recording.

## Acceptance Criteria

- [x] Recording captures console.log, console.warn, and console.error generated after instrumentation starts.
- [x] Events include timestamp, level, message, and page URL.
- [x] Instrumentation can be started and stopped without permanently modifying page behavior.

## Traceability
- Story: US-003
- Acceptance criteria: AC-004, AC-006

## Technical Notes

## Definition of Done
- [x] Implementation complete
- [x] Tests pass
- [x] Review complete
- [x] Docs updated

## Evidence Log

- 2026-05-29T20:06:38Z: Added packaged MAIN-world console recorder injected via scripting.executeScript. It wraps console.log/warn/error only while recording, serializes arguments defensively, forwards timestamp/relativeTime/level/message/source URL/severity events, merges them with CDP console events, and restores original console methods on stop. Verified node --check on bug recorder/page console recorder/background, VM smoke for log/warn/error capture and restore, and npm run firefox:lint exits 0.

- 2026-05-29T20:04:14Z: Adding Firefox MAIN-world console instrumentation after network fallback is in place

- 2026-05-29T19:51:37Z: Dependencies T-006 and T-015 are done; Firefox console instrumentation is unblocked
- 2026-05-29T19:26:27Z: Created from .project/templates/task.md by `delano task add`.
