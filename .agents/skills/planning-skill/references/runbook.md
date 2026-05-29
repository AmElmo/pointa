# Planning Runbook

1. Read `spec.md` and extract constraints.
2. Draft `plan.md` from `.project/templates/plan.md`.
3. Define initial workstreams from `.project/templates/workstream.md`.
4. Add milestone, rollout, rollback, and test strategies.
5. Validate:
   - `bash .agents/scripts/pm/validate.sh`
6. Snapshot:
   - `bash .agents/scripts/pm/status.sh`

Exit gate:
- Architecture decisions justified
- Workstream ownership boundaries clear
- Rollout/rollback explicit
