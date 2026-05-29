---
id: WS-001
name: WS-001 Firefox Packaging Baseline
owner: platform-team
status: done
created: 2026-05-29T19:25:23Z
updated: 2026-05-29T19:35:19Z
---

# Workstream: WS-001 Firefox Packaging Baseline

## Objective
Create a repeatable Firefox extension build target without breaking the current
Chrome extension package. This workstream owns manifest generation, Gecko
metadata, data collection declaration, unsupported permission removal, `web-ext`
tooling, and package architecture documentation.

## Owned Files/Areas
- `extension/manifest.json`
- Proposed Firefox manifest source or generation script
- Proposed `dist/firefox/` output
- `package.json` scripts for Firefox build/lint/run/package
- `docs/DEVELOPMENT.md` or equivalent packaging documentation
- Delano tasks T-001 through T-004

## Dependencies
- Existing Chrome extension source under `extension/`
- Firefox `web-ext` tooling
- Firefox add-on ID and data collection declaration decisions
- Must precede most runtime and QA workstreams

## Risks
- A shared manifest approach could break Chrome or fail Firefox lint.
- Gecko add-on ID and data collection metadata require a release-policy decision.
- Generated artifacts must not become the source of truth.

## Handoff Criteria
- A Firefox output directory can be generated from shared extension sources.
- `web-ext lint` runs against the generated Firefox output.
- Firefox manifest lint errors are resolved or explicitly tracked.
- Chrome manifest remains unchanged unless Chrome validation is also run.
