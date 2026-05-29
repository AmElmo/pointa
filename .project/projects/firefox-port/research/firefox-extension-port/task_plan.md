---
type: research_intake
project: firefox-port
slug: firefox-extension-port
owner: team
status: opened
created: 2026-05-29T19:06:19Z
updated: 2026-05-29T19:10:19Z
---

# Research Plan: Firefox Extension Port Research

## Goal

Answer the research question and fold durable conclusions into canonical Delano project artifacts.

## Primary Question

What technical, product, and release changes are required to port the Pointa Chrome extension to Firefox while preserving local-first MCP workflows?

## Scope

### In Scope

- Gather relevant evidence.
- Capture findings and decisions.
- Identify changes needed in `spec.md`, `plan.md`, `decisions.md`, workstreams, tasks, or updates.

### Out of Scope

- Marking delivery tasks done from research alone.
- External sync writes without normal Delano approval semantics.
- Storing secrets, credentials, or private machine paths.

## Current Phase

Folded forward

## Phases

- [x] Open research intake
- [x] Investigate sources and options
- [x] Summarize findings
- [x] Fold forward into canonical project artifacts or explicitly close as no-action

## Decisions Made

| Decision | Rationale |
| --- | --- |
| Use a Firefox-specific generated manifest/package, not a manual fork of all extension code. | Firefox needs `background.scripts`, `browser_specific_settings.gecko`, and no `debugger` permission, while Chrome still needs `background.service_worker`. |
| Treat Chrome DevTools Protocol features as a separate compatibility workstream. | Firefox does not implement Chrome's `debugger` API, and Pointa currently uses it for responsive viewport emulation plus network/console CDP recording. |
| Make a Firefox MVP before parity work. | Core annotation, toolbar/sidebar, local server, MCP, storage, and normal screenshot flows look portable; CDP-dependent bug/performance fidelity needs redesign. |
| Use `web-ext lint` as the first automated Firefox gate. | It produced concrete baseline errors and warnings against the current `extension/` source. |

## Blockers

| Blocker | Owner | Check-back |
| --- | --- | --- |
| Full parity for responsive capture and CDP network/console timelines has no direct Firefox API equivalent. | team | During architecture probe |
