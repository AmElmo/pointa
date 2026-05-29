#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "" || "${2:-}" == "" ]]; then
  echo "Usage: $0 <slug> <project-name> [owner] [lead]"
  exit 1
fi

slug="$1"
name="$2"
owner="${3:-team}"
lead="${4:-$owner}"

if [[ ! "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Error: slug must be kebab-case"
  exit 1
fi

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
project_dir="$root/.project/projects/$slug"
now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if [[ -d "$project_dir" ]]; then
  echo "Error: project already exists at $project_dir"
  exit 1
fi

mkdir -p "$project_dir"/{tasks,workstreams,updates}

cat > "$project_dir/spec.md" <<SPEC
---
name: $name
slug: $slug
owner: $owner
status: planned
created: $now
updated: $now
outcome: <measurable target>
uncertainty: <low|medium|high>
probe_required: <true|false>
probe_status: <pending|skipped|completed>
---

# Spec: $name

## Executive Summary

## Problem and Users

## Outcome and Success Metrics

## User Stories
- US-001: As a <user>, I want <capability>, so that <outcome>.

## Acceptance Scenarios
- AC-001: Given <context>, when <action>, then <observable result>.

## Scope
### In Scope
### Out of Scope

## Functional Requirements

## Non-Functional Requirements

## Assumptions
- <assumption to validate>

## Needs Clarification
- <question that must be answered before activation or execution>

## Hypotheses and Unknowns

## Touchpoints to Exercise

## Probe Findings

## Footguns Discovered

## Remaining Unknowns

## Dependencies

## Approval Notes
SPEC

cat > "$project_dir/plan.md" <<PLAN
---
name: $name
status: planned
lead: $lead
created: $now
updated: $now
linear_project_id:
risk_level: <low|medium|high>
spec_status_at_plan_time: planned
---

# Delivery Plan: $name

## What Changed After Probe

## Technical Context

## Architecture Decisions

## Policy and Contract Checks
- [ ] `.project` remains the execution source of truth
- [ ] Probe decision is explicit
- [ ] Evidence gates are defined before handoff
- [ ] External sync writes require dry-run or operator approval

## Generated Artifact Map
- `spec.md`: <source or generation notes>
- `plan.md`: <source or generation notes>
- `workstreams/`: <source or generation notes>
- `tasks/`: <source or generation notes>

## Complexity Exceptions
- <exception, rationale, and owner>

## Probe-Driven Architecture Changes

## Workstream Design

## Milestone Strategy

## Rollout Strategy

## Test Strategy

## Rollback Strategy

## Remaining Delivery Risks
PLAN

cat > "$project_dir/decisions.md" <<'DECISIONS'
# Decisions

Track key project decisions with context and rationale.
DECISIONS

# Ensure registries exist
mkdir -p "$root/.project/registry"
if [[ ! -f "$root/.project/registry/linear-map.json" ]]; then
  cat > "$root/.project/registry/linear-map.json" <<REG
{
  "version": 1,
  "updated": "$now",
  "projects": {},
  "tasks": {}
}
REG
fi

if [[ ! -f "$root/.project/registry/migration-map.json" ]]; then
  cat > "$root/.project/registry/migration-map.json" <<REG
{
  "version": 1,
  "updated": "$now",
  "mappings": []
}
REG
fi

echo "Created Delano project scaffold: .project/projects/$slug"

"$root/.agents/scripts/pm/validate.sh"
