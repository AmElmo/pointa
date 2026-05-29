# Quality Runbook

1. Determine risk level (low/medium/high).
2. Execute required tests and capture logs:
   - `bash .agents/scripts/test-and-log.sh <test command>`
3. Verify acceptance criteria and evidence completeness.
4. Re-run validation:
   - `bash .agents/scripts/pm/validate.sh`
5. Produce gate decision summary.

Exit gate:
- Required checks pass for risk level
- Critical unresolved defects = 0
- Evidence links are present
