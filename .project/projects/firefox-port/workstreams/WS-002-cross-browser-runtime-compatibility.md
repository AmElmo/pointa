---
id: WS-002
name: WS-002 Cross-Browser Runtime Compatibility
owner: extension-team
status: done
created: 2026-05-29T19:25:23Z
updated: 2026-05-29T19:54:02Z
---

# Workstream: WS-002 Cross-Browser Runtime Compatibility

## Objective
Make the shared extension runtime safe in Firefox by adding browser/API
capability checks, adapting background/injection behavior, centralizing local
server URL handling, and preventing unsupported debugger/CDP calls.

## Owned Files/Areas
- `extension/background/background.js`
- Cross-browser helper module or shared utility area
- Content script injection paths
- Local server URL and health-check paths
- Firefox manifest permission scope
- Delano tasks T-005 through T-009

## Dependencies
- WS-001 generated Firefox package baseline
- Current local server endpoint behavior on `http://127.0.0.1:4242`
- Firefox `scripting`, `tabs`, `storage`, and host permission support

## Risks
- Background lifecycle differences can cause flaky injection or lost state.
- Scattered direct `chrome.debugger` calls can break Firefox at runtime.
- Server URL fallbacks currently exist in multiple files and may drift.

## Handoff Criteria
- Firefox can open Pointa on a supported localhost page without runtime API
  errors.
- Unsupported debugger/CDP features are guarded behind capability checks.
- Local server offline/online states behave consistently in Firefox and Chrome.
