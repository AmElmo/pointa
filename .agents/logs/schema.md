# Log Schema

Delano logs are local runtime evidence. Treat them as operationally sensitive and do not copy them into public issues, PRs, or reports without review.

## `changes.jsonl`

Metadata is redacted before write by Delano logging helpers.

```json
{
  "timestamp": "ISO8601 UTC",
  "type": "event_type",
  "actor": "system|agent|user",
  "meta": {}
}
```

## `sessions.jsonl`

```json
{
  "timestamp": "ISO8601 UTC",
  "action": "start|end",
  "sessionId": "string"
}
```

## `prompts.jsonl`

Raw prompt text is not stored by default. Default prompt logs store only hash/length/redaction metadata.

```json
{
  "timestamp": "ISO8601 UTC",
  "prompt_hash": "sha256 hex string",
  "prompt_length": 123,
  "redaction": {
    "applied": true,
    "replacements": 1
  }
}
```

Optional environment flags:

- `DELANO_LOG_REDACTED_PROMPTS=1`: also write `prompt_redacted`.
- `DELANO_LOG_RAW_PROMPTS=1`: also write `prompt_raw`, redacted unless explicitly overridden.
- `DELANO_LOG_UNREDACTED_PROMPTS=1`: allow unredacted `prompt_raw`; only use in private debugging contexts.

## `test-runs.jsonl`

Test logs intentionally preserve command output as evidence. Review logs before sharing outside the local repo.

```json
{
  "timestamp": "ISO8601 UTC",
  "command": "string",
  "exit_code": 0,
  "log_file": ".agents/logs/tests/<id>.log"
}
```
