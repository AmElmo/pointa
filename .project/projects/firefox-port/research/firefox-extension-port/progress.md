---
type: research_progress
project: firefox-port
slug: firefox-extension-port
created: 2026-05-29T19:06:19Z
updated: 2026-05-29T19:10:19Z
---

# Progress: Firefox Extension Port Research

## 2026-05-29T19:06:19Z

- Opened research intake for project `firefox-port`.
- Primary question: What technical, product, and release changes are required to port the Pointa Chrome extension to Firefox while preserving local-first MCP workflows?

## 2026-05-29T19:10:19Z

- Audited current extension manifest, background script, and content script modules.
- Checked Mozilla documentation for MV3 background scripts, API namespace compatibility, scripting, content script isolation, screenshot capture, webRequest, host permissions, Gecko manifest settings, web-ext, and signing.
- Ran `npx --yes web-ext lint --source-dir extension --output json`; baseline result was 2 errors and 43 warnings.
- Folded durable findings into `spec.md`, `plan.md`, and `decisions.md`.

## Validation Evidence

- `npx --yes web-ext lint --source-dir extension --output json`: failed as expected against current Chrome package with 2 Firefox compatibility errors and 43 warnings. Errors: missing Firefox-compatible background scripts fallback, missing Gecko add-on ID. Key warnings: invalid Firefox `debugger` permission, missing Gecko data collection permissions, unsupported `chrome.debugger` API uses, and unsafe `innerHTML` assignments.
- `delano research firefox-port firefox-extension-port --title "Firefox Extension Port Research" --question "What technical, product, and release changes are required to port the Pointa Chrome extension to Firefox while preserving local-first MCP workflows?" --owner team --json`: created intake and passed validation.

## Handoff Summary

- Changed: created Firefox port Delano project and research intake, investigated compatibility, recorded findings, and folded the plan into canonical project artifacts.
- Evidence: local source audit, Mozilla documentation, `web-ext lint` baseline, and Delano validation at intake creation.
- Blockers: no direct Firefox equivalent for `chrome.debugger`; full bug/performance timeline and responsive capture parity require architecture work.
- Lease state: no lease acquired.
- Next safe action: implement a Firefox manifest/build probe and disable or replace CDP-dependent paths behind browser capability checks.
