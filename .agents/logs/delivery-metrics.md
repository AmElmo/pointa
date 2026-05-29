# Delivery Metrics

Delivery metric events are local, metadata-only records used to summarize Delano delivery flow without copying prompt text, raw logs, customer data, or machine-local paths.

## Location

- Runtime stream: `.agents/logs/delivery-events.jsonl`
- Compatibility runtime: `.claude/logs/delivery-events.jsonl`
- Contract: `.agents/schemas/metrics/delivery-events.schema.json`

## Captured events

- `task_status_changed`: task lifecycle movement, especially ready/in-progress/done/blocked.
- `validation_run`: validation command result and count summary.
- `lease_acquired` / `lease_released`: multi-agent lease lifecycle.
- `drift_report_generated`: dry-run sync drift report summary.
- `repair_plan_created`: gated repair plan summary.
- `closeout_recorded`: closeout and learning-loop handoff.

## Privacy posture

Events are metadata-only summaries. Store repo-relative paths only, hash or omit sensitive values, and keep command evidence limited to commands that are safe to show in local project evidence.
