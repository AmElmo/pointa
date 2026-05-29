# Closeout Runbook

1. Confirm all required tasks are in terminal state.
2. Ensure quality evidence package is complete.
3. Write completion summary from template.
4. Draft a learning proposal for any proposed rule, skill, schema, or fixture update.
5. Keep learning proposals in `proposed` state until reviewed and explicitly accepted.
6. Update project status and mapping registry.
7. Review event log:
   - `bash .agents/scripts/query-log.sh --last 100`
6. Validate:
   - `bash .agents/scripts/pm/status.sh`
   - `bash .agents/scripts/pm/validate.sh`

Exit gate:
- Outcome review captured
- Learning proposals reviewed before adoption
- Evidence complete
- Delivery state closed cleanly
