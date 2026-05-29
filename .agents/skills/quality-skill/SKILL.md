---
name: quality-skill
description: Verify release readiness and enforce quality gates with risk-based checks and evidence capture. Use before closure or merge.
---

# quality-skill

## Trigger context
- target tasks are implemented and ready for verification

## Required inputs
- changed_scope
- risk_level
- test_requirements

## Output schema
- quality_evidence bundle
- pass/fail gate decision

## Quality checks
- required tests executed by risk level
- acceptance criteria complete
- unresolved critical defects = 0

## Failure behavior
- stop merge readiness on failed critical checks
- emit remediation checklist

## Allowed side effects
- append evidence logs in task files
- write test logs under `.agents/logs/tests/`

## Script hooks
- `bash .agents/scripts/test-and-log.sh <command>`
- `bash .agents/scripts/pm/validate.sh`

## Execution assets
- `references/runbook.md`
- `templates/quality-evidence.md`
- `templates/gate-decision.md`
