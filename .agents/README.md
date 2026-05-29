# .agents

Canonical shared runtime for Delano.

## Source-of-truth map

- Root agent workflow and boundaries: `AGENTS.md`
- Process and operator handbook: `HANDBOOK.md`
- Delivery contracts and evidence: `.project/`
- Runtime scripts: `.agents/scripts/`
- Shared rules: `.agents/rules/`
- Hooks: `.agents/hooks/`
- Skills: `.agents/skills/`
- Logs: `.agents/logs/`
- Shared adapter utilities: `.agents/common/`
- Agent-specific adapter notes: `.agents/adapters/<agent>/`

The compatibility path `.claude/` may mirror this runtime for agents that still expect Claude-style paths.

## Required first-turn behavior

Every adapter should start from `AGENTS.md`, inspect the relevant `.project` contract and current git state, then use the adapter note only for runtime-specific differences.

## Core validation commands

- `bash .agents/scripts/pm/validate.sh`
- `npm test`
- `npm run build:assets`
- `npm run check:package-manifest`

## Completion rule

Do not report a task as done until the change is present, evidence is recorded, validation has passed or been explicitly marked not run, and blockers are named.

## Safety boundaries

Keep logs privacy-safe, avoid absolute path leaks in docs/contracts/hook output, and do not perform destructive git or remote-write operations without an explicit task instruction.
