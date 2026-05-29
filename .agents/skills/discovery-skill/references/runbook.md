# Discovery Runbook

1. Confirm project slug, owner, and measurable outcome.
2. If project scaffold is missing, run:
   - `bash .agents/scripts/pm/init.sh <slug> "<Project Name>" <owner> <lead>`
3. Fill `spec.md` using `.project/templates/spec.md`.
4. Ensure non-goals and dependencies are explicit.
5. Validate:
   - `bash .agents/scripts/pm/validate.sh`

Exit gate:
- Spec outcome is measurable
- Non-goals are explicit
- Assumptions are documented
