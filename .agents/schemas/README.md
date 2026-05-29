# Delano artifact schema scope

This directory defines the first contract surface for Delano project artifacts.

`artifact-scope.json` defines which artifacts are in scope, which fields are required or optional, which fields should become enum-constrained, and which values can be derived by tooling later.

`artifacts/*.schema.json` contains the first JSON Schema contracts for each scoped artifact type. The schemas are intentionally additive: they make canonical fields explicit without forbidding current project-specific metadata.

## In scope for the first schema pass

- Project specs
- Project plans
- Workstreams
- Tasks
- Decision logs
- Updates
- Context documents
- Evidence records in task logs or update files

## Validation posture

The scope and schema contracts are additive and local-first. Existing validation still runs through `bash .agents/scripts/pm/validate.sh`; schema-specific validation starts with `npm run check:artifact-scope` and `npm run check:artifact-schemas` before stricter artifact-instance enforcement is added.
