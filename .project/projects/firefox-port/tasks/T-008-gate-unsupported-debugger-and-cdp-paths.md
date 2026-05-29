---
id: T-008
name: Gate unsupported debugger and CDP paths
status: done
workstream: WS-002
created: 2026-05-29T19:26:27Z
updated: 2026-05-29T19:39:04Z
linear_issue_id: 
github_issue: 
github_pr: 
depends_on: [T-005]
conflicts_with: []
parallel: true
priority: high
estimate: M
story_id: US-003
acceptance_criteria_ids: [AC-004]
---

# Task: Gate unsupported debugger and CDP paths

## Description

Protect all viewport emulation, CDP screenshot, network, log, and runtime debugger paths behind capability checks.

## Acceptance Criteria

- [x] Firefox runtime never calls chrome.debugger methods.
- [x] Chrome debugger behavior remains available when capability checks pass.
- [x] Firefox receives structured unavailable/degraded responses for CDP-only operations.

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

- 2026-05-29T19:39:04Z: All chrome.debugger call sites in extension/background/background.js are protected by hasCapability('debugger') entry-point guards; setupCDPEventListener is only registered when debugger is available; Firefox setViewport/startCDPRecording return structured error responses through message handlers; stopCDPRecording returns empty event arrays without debugger; Chrome paths remain intact when capability is true; node --check and npm run firefox:lint pass with 0 errors.

- 2026-05-29T19:38:28Z: Verify and complete debugger/CDP capability gates

- 2026-05-29T19:38:17Z: Dependency T-005 is done; debugger/CDP guard task is ready
- 2026-05-29T19:26:27Z: Created from .project/templates/task.md by `delano task add`.
