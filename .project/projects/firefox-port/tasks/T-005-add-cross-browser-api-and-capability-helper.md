---
id: T-005
name: Add cross-browser API and capability helper
status: done
workstream: WS-002
created: 2026-05-29T19:26:26Z
updated: 2026-05-29T19:37:38Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-001]
conflicts_with: []
parallel: true
priority: high
estimate: M
story_id: US-003
acceptance_criteria_ids: [AC-004]
---

# Task: Add cross-browser API and capability helper

## Description

Create a small runtime helper for browser namespace access and capability checks for debugger, scripting, tabs, storage, and webRequest.

## Acceptance Criteria

- [x] Shared extension code can query capabilities without directly probing unsupported APIs throughout the codebase.
- [x] The helper works when only chrome namespace is present and when browser namespace is present.
- [x] Debugger availability is exposed as an explicit false capability in Firefox.

## Traceability
- Story: US-003
- Acceptance criteria: AC-004

## Technical Notes

## Definition of Done
- [ ] Implementation complete
- [ ] Tests pass
- [ ] Review complete
- [ ] Docs updated

## Evidence Log

- 2026-05-29T19:37:38Z: Added extension/common/browser-compat.js global PointaBrowser helper; background loads helper, exposes capabilities via messages, injects helper before content modules, and gates debugger/CDP paths; node --check passes for helper/background; capability VM smoke passes for chrome debugger=true and firefox debugger=false; npm run firefox:lint exits with 0 errors.

- 2026-05-29T19:37:19Z: Integrate cross-browser compatibility helper implementation from worker

- 2026-05-29T19:32:42Z: Dependency T-001 is done; runtime compatibility helper task is ready
- 2026-05-29T19:26:26Z: Created from .project/templates/task.md by `delano task add`.
