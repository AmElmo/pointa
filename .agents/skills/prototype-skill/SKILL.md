---
name: prototype-skill
description: Run a time-boxed Prototype Probe to retire material uncertainty before spec approval. Use when `spec.md` is still draft, `probe_required` is true, or a narrow experiment is needed to bound technical or delivery risk before planning.
---

# prototype-skill

## Trigger context
- `spec.md` is still draft and contains material uncertainty
- `probe_required: true`
- approval would otherwise be speculative
- a narrow experiment can retire a specific technical, UX, integration, or delivery risk faster than discussion alone

## Required inputs
- `spec.md` with uncertainty and probe fields populated
- target uncertainty to retire or bound
- time-box and experiment constraints
- success or failure evidence expected from the probe

## Output schema
- updated draft `spec.md`
- probe findings summary
- explicit approval recommendation (`approve`, `revise`, or `run another narrow probe`)
- touched surfaces and footguns list

## Quality checks
- probe stays time-boxed, normally `<= 1 day`
- experiment is narrow and directly tied to the uncertainty being tested
- no production merge happens directly from probe output
- findings are folded back into `spec.md` before continuation
- touched surfaces, footguns, and remaining uncertainty are explicit

## Failure behavior
- stop if the probe is too broad, open-ended, or not tied to a material uncertainty
- return a narrower probe design when the current one is not safe or useful
- do not present exploratory output as production-ready implementation

## Allowed side effects
- update draft `spec.md`
- create or update temporary probe notes inside the project folder when needed
- record approval recommendation and follow-up actions

## Script hooks
- `bash .agents/scripts/pm/validate.sh`
- `bash .agents/scripts/pm/status.sh`

## Execution assets
- `references/runbook.md`
- `references/probe-design-checklist.md`
- `templates/probe-findings.md`
- `templates/probe-approval-recommendation.md`
