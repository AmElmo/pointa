---
name: sync-skill
description: Reconcile local contracts with Linear and GitHub state, repair mapping and status drift, and update registry files. Use when task state changes or sync drift is suspected.
---

# sync-skill

## Trigger context
- active tasks changed
- status or dependency drift suspected

## Required inputs
- project_slug
- local_registry
- task_files

## Output schema
- updated_registry
- drift_report

## Quality checks
- active tasks mapped
- no duplicate mapping
- dependency parity pass

## Failure behavior
- dry-run when uncertainty detected
- emit conflict resolution actions

## Allowed side effects
- update `.project/registry/linear-map.json`
- update local IDs/links in task contracts

## Script hooks
- `bash .agents/scripts/pm/status.sh`
- `bash .agents/scripts/pm/validate.sh`

## Execution assets
- `references/runbook.md`
- `templates/drift-report.md`
- `templates/conflict-resolution-actions.md`
