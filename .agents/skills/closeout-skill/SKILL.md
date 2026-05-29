---
name: closeout-skill
description: Close the delivery loop and capture completion evidence, status updates, and handoff artifacts. Use after quality gates pass.
---

# closeout-skill

## Trigger context
- quality gates passed for closure scope

## Required inputs
- project_slug
- completed_task_ids
- outcome_review

## Output schema
- closure update
- completion summary
- updated status in contracts/registry
- learning proposals for any rule, skill, schema, or fixture changes discovered during closeout

## Quality checks
- required tasks resolved
- evidence package complete
- outcome review captured
- learning proposals are reviewed before adoption

## Failure behavior
- block closure when evidence is incomplete
- return missing-evidence list

## Allowed side effects
- update project/task statuses
- append completion summary and release evidence

## Script hooks
- `bash .agents/scripts/pm/status.sh`
- `bash .agents/scripts/query-log.sh --last 50`
- `bash .agents/scripts/pm/validate.sh`

## Execution assets
- `references/runbook.md`
- `templates/outcome-review.md`
- `templates/closure-checklist.md`
- `templates/learning-proposal.md`
