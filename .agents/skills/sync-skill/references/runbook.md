# Sync Runbook

1. Read local contracts and `.project/registry/linear-map.json`.
2. Compare with Linear/GitHub state.
3. Apply idempotent cycle:
   - create missing mappings
   - update changed statuses/links
   - preserve existing IDs
4. Write drift report and mapping updates.
5. Validate:
   - `bash .agents/scripts/pm/status.sh`
   - `bash .agents/scripts/pm/validate.sh`

Exit gate:
- No orphaned active tasks
- No duplicate mappings
- Status/dependency parity confirmed
