# How to write an AGENTS.md that works

AGENTS.md carries the context the agent needs every turn. Skills and `docs/` hold optional, task-specific workflows. Do not confuse the two.

## What belongs in AGENTS.md

1. Operating rules: startup sequence, approval boundaries, destructive-action handling, definition of done, default workspace.
2. Source-of-truth map: compact index pointing to where real knowledge lives. Include version-sensitive areas and "if working on X, read Y first" hints.
3. Order-of-operations: phrase as a sequence, not a blanket rule. Not "always read docs first" but: explore structure -> retrieve relevant docs -> implement -> verify.
4. Stable, high-impact constraints: repo location, branch policy, style rules, runtime quirks, business-logic conventions. High-frequency, high-impact, easy to miss.

## What does not belong

Long prose, full runbooks, rarely-used procedures, or anything duplicated from `docs/`. Point to it instead.

## Example skeleton (Delano-style)

```markdown
## Mission
One line: what this project is, what good work looks like.

## First-Turn Workflow
1. Inspect repo structure and current git state before assuming shape or ownership.
2. Read the relevant local source of truth for the area being changed.
3. Prefer current repo reality over stale plans or model memory.
4. Make the smallest coherent change that satisfies the task.
5. Verify with the narrowest meaningful check, then report done / partial / blocked explicitly.

## Source of Truth
- `HANDBOOK.md`: delivery model, project contracts, evidence, continuity rules.
- `ARCHITECTURE.md`: product architecture and runtime/orchestration model.
- `.project/context/`: current project memory - start with `README.md`, then only what is relevant.
- `.project/projects/<project>/`: active delivery contracts (`spec.md`, `plan.md`, `decisions.md`, `workstreams/`, `tasks/`, `updates/`).
- `.agents/`: shared delivery/runtime assets, skills, rules, hooks, PM scripts.
- `README.md`: product status, setup, commands, operational gaps.
- `src/`, `skills/`, `starter/`, `fixtures/`, `tests/`: implemented surface.
- `possible-specs.md`: archived only - not active guidance.

## Retrieval Index
- Delivery workflow -> `HANDBOOK.md` + matching `.agents/skills/<step>-skill/SKILL.md`
- Active scope / acceptance -> `spec.md` + relevant task files
- Architecture / runtime -> `ARCHITECTURE.md`, `plan.md`, `.project/context/system-patterns.md`
- Repo layout -> `.project/context/project-structure.md`
- Stack / commands -> `.project/context/tech-context.md`, `README.md`, `package.json`
- Style / docs conventions -> `.project/context/project-style-guide.md`
- GUI/browser checks -> `.project/context/gui-testing.md`
- Status / evidence -> `.project/context/progress.md`, `updates/`
- CRM/provider work -> `src/connectors/`, `fixtures/providers/`, provider tests
- Starter/runtime assets -> `starter/`, `.runtime/` expectations, starter validation tests

## Delano Order of Operations
Use the full flow for features, contract changes, or material improvements:
1. Discovery - define measurable outcome in `spec.md` (`discovery-skill`).
2. Prototype Probe - time-boxed, only if uncertainty is high; findings back to spec.
3. Planning - architecture, milestones, rollout, rollback in `plan.md` (`planning-skill`).
4. Breakdown - atomic tasks, binary acceptance, acyclic dependencies (`breakdown-skill`).
5. Synchronization - reconcile with Linear/GitHub when tracker state is involved (`sync-skill`).
6. Execution - dependency-safe tasks inside workstream boundaries, evidence in `updates/` (`execution-skill`).
7. Quality Ops - risk-based checks, verify acceptance before closure (`quality-skill`).
8. Closeout - compare to outcome, update project memory, close the loop (`closeout-skill`).

For small local fixes: follow the first-turn workflow; update delivery/context files only when scope, architecture, status, or evidence changes.

## Safety
- No destructive actions without approval.
- Prefer recoverable edits.
- Confirm before outbound/public actions.

## Verification
- Run lint/test/build when relevant; if skipped, say why.
- Mark done / partial / blocked explicitly.
```

## Core principle

AGENTS.md should contain the minimum persistent context needed to make correct decisions reliably, and a compact map for retrieving everything else.
