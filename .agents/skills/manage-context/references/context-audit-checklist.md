# Context Audit Checklist

Use this checklist before declaring the context pack healthy.

## Reality check
- Does `project-overview.md` describe the project as it exists now?
- Does `project-brief.md` still match the active outcome and constraints?
- Does `tech-context.md` match the real implementation shape?
- Does `product-context.md` match the real user or delivery problem?
- Does `progress.md` describe actual current status rather than intended status?

## Drift check
- Are there claims that conflict with `spec.md`, `plan.md`, or workstreams?
- Are there terms used inconsistently across context files?
- Are owners, boundaries, or dependencies implied in one file but absent in others?
- Are testing expectations current, especially in `gui-testing.md`?

## Template debt check
- Are placeholder markers or generic starter phrases still present?
- Are sections filled with boilerplate rather than repo-specific facts?
- Does the pack still read like an install scaffold instead of a lived project?

## Handoff check
- Could a new agent or teammate resume work from this context pack without guessing?
- Are the main constraints, risks, and non-goals easy to find?
- Are open questions explicit?
