---
name: execution-skill
description: Execute mapped tasks with stream discipline, dependency safety checks, and evidence updates. Use when tasks are ready for implementation.
---

# execution-skill

## Trigger context
- tasks are ready and dependency-safe

## Required inputs
- task_ids
- stream_boundaries
- dependency_state

## Output schema
- updated task status
- progress updates
- delivery artifacts (commits/PRs/notes)

## Quality checks
- blockers explicit with owner/check-back time
- progress updates current
- stream boundaries respected

## Failure behavior
- stop work on hard blockers
- escalate file ownership conflict

## Allowed side effects
- update task frontmatter/status
- append updates under `.project/projects/<slug>/updates/`

## Script hooks
- `bash .agents/scripts/pm/in-progress.sh`
- `bash .agents/scripts/pm/standup.sh`
- `bash .agents/scripts/pm/next.sh`

## Execution assets
- `references/runbook.md`
- `templates/blocker-update.md`
- `templates/stream-update.md`
