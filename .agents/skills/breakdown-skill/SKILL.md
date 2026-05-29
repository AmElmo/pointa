---
name: breakdown-skill
description: Decompose an approved plan into atomic tasks with dependencies and acceptance criteria. Use when planning is complete and execution must be prepared.
---

# breakdown-skill

## Trigger context
- plan is complete and ready for decomposition

## Required inputs
- spec_path
- plan_path
- workstream_files

## Output schema
- task_files
- dependency_graph

## Quality checks
- acceptance criteria are binary
- estimate present per task
- dependency graph acyclic

## Failure behavior
- stop on circular dependency
- return ambiguity report

## Allowed side effects
- create/update `.project/projects/<slug>/tasks/*.md`

## Script hooks
- `bash .agents/scripts/pm/validate.sh`
- `bash .agents/scripts/pm/next.sh`
- `bash .agents/scripts/pm/blocked.sh`

## Execution assets
- `references/runbook.md`
- `templates/task-batch-summary.md`
- `templates/ambiguity-report.md`
