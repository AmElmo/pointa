---
name: manage-context
description: Repair and maintain `.project/context/` so it reflects current project reality. Use when context files are stale, contradictory, still template-like, after major scope or architecture changes, before handoff, or when execution friction suggests context debt.
---

# manage-context

## Trigger context
- `.project/context/` still contains starter or placeholder language
- implementation reality has drifted from spec, plan, or workstreams
- repeated confusion appears around scope, terminology, ownership, architecture, or testing
- a handoff, restart, or milestone review needs trustworthy context
- a major scope, workflow, or architecture change landed and context was not refreshed

## Required inputs
- current `.project/context/` files
- related project docs (`spec.md`, `plan.md`, `workstreams/*.md`, `decisions.md`, progress notes)
- recent execution evidence (task state, code changes, review feedback, logs)

## Output schema
- updated `.project/context/*.md` files where needed
- context debt summary
- explicit contradictions or evidence gaps list
- recommended follow-up actions when context cannot be repaired safely

## Quality checks
- no obvious template placeholders remain
- context matches current implementation and delivery reality
- terminology is consistent across files
- scope, constraints, and non-goals are explicit
- progress reflects evidence, not aspiration
- unresolved uncertainty is stated plainly instead of being hidden

## Failure behavior
- do not invent missing facts
- stop short of rewriting uncertain sections as if they were confirmed
- return evidence gaps and contradiction notes when repair is partial
- prefer an explicit partial refresh over fake completeness

## Allowed side effects
- update files under `.project/context/`
- remove stale placeholder text from context files
- normalize duplicated or conflicting phrasing across context files
- add concise dated notes when they improve handoff clarity

## Script hooks
- `bash .agents/scripts/pm/validate.sh`
- `bash .agents/scripts/pm/status.sh`
- `bash .agents/scripts/pm/search.sh "<term>"`

## Execution assets
- `references/runbook.md`
- `references/context-audit-checklist.md`
- `templates/context-debt-report.md`
- `templates/context-refresh-summary.md`
