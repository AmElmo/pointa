# Prototype Probe Runbook

1. Read the draft `spec.md` and identify the single material uncertainty to retire or bound.
2. Confirm `probe_required: true` and keep the probe narrow.
3. Define the smallest useful experiment:
   - what is being tested
   - what evidence is needed
   - what touched surfaces are in scope
   - what is explicitly out of scope
4. Time-box the probe, normally to `<= 1 day`.
5. Run the experiment using the safest path, CLI-first when feasible.
6. Do not merge probe output directly into production delivery flow.
7. Fold findings back into `spec.md`:
   - what changed after probe
   - touched surfaces
   - footguns
   - remaining uncertainty
   - approval recommendation
8. Validate if contracts changed:
   - `bash .agents/scripts/pm/validate.sh`
9. Snapshot status when useful:
   - `bash .agents/scripts/pm/status.sh`

Exit gate:
- probe findings recorded
- approval recommendation is clear
- next step is explicit: approve, revise, or run another narrow probe
