---
id: WS-006
name: WS-006 Firefox Release and Documentation
owner: release-team
status: done
created: 2026-05-29T19:25:23Z
updated: 2026-05-29T21:48:19Z
---

# Workstream: WS-006 Firefox Release and Documentation

## Objective
Prepare Firefox for a release decision by documenting the signing/distribution
path, user and developer setup, privacy/data collection declarations, known
limitations, and final readiness evidence.

## Owned Files/Areas
- `README.md`
- `docs/DEVELOPMENT.md`
- Firefox release/signing documentation
- Privacy/data collection notes
- Firefox release readiness report
- Delano tasks T-026 through T-029

## Dependencies
- WS-001 lintable/packageable Firefox build
- WS-005 QA and AMO warning disposition
- Product decision on listed AMO versus self-distributed signed XPI

## Risks
- AMO submission requires stable metadata and data collection declarations.
- Public documentation can overpromise CDP-equivalent behavior if not tied to the
  parity matrix.
- Release credentials and signing flow may not be available locally.

## Handoff Criteria
- Distribution channel and signing workflow are documented.
- User/developer docs explain Firefox setup and feature limitations.
- Privacy/data collection declaration matches actual Firefox behavior.
- Release readiness report recommends release, internal beta, or defer with
  evidence.
