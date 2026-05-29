---
name: onboarding
description: Analyze a repository `AGENTS.md` before broader work begins and improve it only when the user gives explicit approval. Use when the user wants a first-pass review of repo instructions, wants to tighten `AGENTS.md` quality, or needs a compact operating-rules and source-of-truth map for future agent turns.
---

# onboarding

## Trigger context
- the user wants an explicit first-turn onboarding pass for a repository
- `AGENTS.md` exists but may be too thin, stale, or missing key guidance
- the user asks to review, critique, or improve repo-level agent instructions
- Delano has just been introduced and `AGENTS.md` should be checked before deeper work starts

## Required inputs
- repo-root `AGENTS.md`
- directly relevant source-of-truth docs referenced by `AGENTS.md`
- explicit user approval before analyzing `AGENTS.md`
- separate explicit user approval before editing `AGENTS.md`

## Output schema
- concise gap analysis against `references/agents-md-best-practices.md`
- keep/add/remove recommendations tied to the repo's actual workflow
- if edit approval is given, an updated `AGENTS.md` that stays compact and retrieval-oriented
- explicit note when analysis or edits were skipped because approval was not given

## Quality checks
- do not analyze `AGENTS.md` until the user explicitly approves the review
- do not edit `AGENTS.md` until the user explicitly approves changes
- preserve repo-specific truth instead of pasting generic boilerplate
- keep `AGENTS.md` compact and point to deeper docs instead of duplicating them
- make approval boundaries, order of operations, and verification expectations explicit

## Failure behavior
- if approval is missing, stop and ask plainly
- if `AGENTS.md` is absent, report that and propose only a minimal skeleton
- if source-of-truth docs disagree, surface the conflict instead of flattening it
- if the repo intentionally keeps `AGENTS.md` thin, prefer the minimum coherent improvement

## Allowed side effects
- read `AGENTS.md` and directly relevant source-of-truth docs
- update `AGENTS.md` only after explicit edit approval
- add concise retrieval hints that point to canonical docs

## Script hooks
- `delano onboarding`
- `bash .agents/scripts/pm/validate.sh`

## Execution assets
- `references/agents-md-best-practices.md`
