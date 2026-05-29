#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  research.sh <project-slug> <research-slug> [options]

Creates a repo-native Delano research intake folder for a project.

Required arguments:
  project-slug          Existing Delano project slug
  research-slug         Research folder slug in kebab-case

Options:
  --title <title>        Human-readable research title
  --question <question>  Primary research question
  --owner <owner>        Research owner, defaults to team
  --no-validate          Create artifacts without running Delano validation
  --json                 Print a single machine-readable JSON result
  -h, --help             Show this help

Agent notes:
  - Use this before mutating spec/plan/tasks when intent is unclear.
  - Update findings.md and progress.md during investigation.
  - Fold durable conclusions forward into spec.md, plan.md, decisions.md, workstreams, tasks, or updates.
  - Research files are supporting discovery state, not executable task truth.
USAGE
}

resolve_python() {
  if command -v python3 >/dev/null 2>&1 && python3 -c "import sys" >/dev/null 2>&1; then
    PYTHON_CMD=(python3)
  elif command -v py >/dev/null 2>&1 && py -3 -c "import sys" >/dev/null 2>&1; then
    PYTHON_CMD=(py -3)
  elif command -v python >/dev/null 2>&1 && python -c "import sys" >/dev/null 2>&1; then
    PYTHON_CMD=(python)
  else
    echo "Error: Python runtime not found. Install python3, python, or py -3." >&2
    exit 1
  fi
}

resolve_python

json_escape() {
  "${PYTHON_CMD[@]}" -c 'import json,sys; print(json.dumps(sys.stdin.read().rstrip("\n")))'
}

if [[ "${1:-}" == "" || "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "${2:-}" == "" ]]; then
  usage
  exit 1
fi

project_slug="$1"
research_slug="$2"
shift 2

title=""
question=""
owner="team"
validate="true"
json="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title)
      title="${2:-}"
      if [[ -z "$title" ]]; then echo "Error: --title requires a value"; exit 1; fi
      shift 2
      ;;
    --question)
      question="${2:-}"
      if [[ -z "$question" ]]; then echo "Error: --question requires a value"; exit 1; fi
      shift 2
      ;;
    --owner)
      owner="${2:-}"
      if [[ -z "$owner" ]]; then echo "Error: --owner requires a value"; exit 1; fi
      shift 2
      ;;
    --no-validate)
      validate="false"
      shift
      ;;
    --json)
      json="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      ;;
    --*)
      echo "Error: unknown option: $1"
      exit 1
      ;;
    *)
      echo "Error: unexpected positional argument: $1"
      exit 1
      ;;
  esac
done

if [[ ! "$project_slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Error: project-slug must be kebab-case"
  exit 1
fi

if [[ ! "$research_slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Error: research-slug must be kebab-case"
  exit 1
fi

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$root"

project_dir=".project/projects/$project_slug"
if [[ ! -d "$project_dir" ]]; then
  echo "Error: Delano project not found: $project_dir"
  exit 1
fi

research_dir="$project_dir/research/$research_slug"
if [[ -d "$research_dir" ]]; then
  echo "Error: research intake already exists at $research_dir"
  exit 1
fi

now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
title="${title:-${research_slug//-/ }}"
question="${question:-<primary research question>}"

mkdir -p "$research_dir"

cat > "$research_dir/task_plan.md" <<PLAN
---
type: research_intake
project: $project_slug
slug: $research_slug
owner: $owner
status: opened
created: $now
updated: $now
---

# Research Plan: $title

## Goal

Answer the research question and fold durable conclusions into canonical Delano project artifacts.

## Primary Question

$question

## Scope

### In Scope

- Gather relevant evidence.
- Capture findings and decisions.
- Identify changes needed in \`spec.md\`, \`plan.md\`, \`decisions.md\`, workstreams, tasks, or updates.

### Out of Scope

- Marking delivery tasks done from research alone.
- External sync writes without normal Delano approval semantics.
- Storing secrets, credentials, or private machine paths.

## Current Phase

Opened

## Phases

- [x] Open research intake
- [ ] Investigate sources and options
- [ ] Summarize findings
- [ ] Fold forward into canonical project artifacts or explicitly close as no-action

## Decisions Made

| Decision | Rationale |
| --- | --- |

## Blockers

| Blocker | Owner | Check-back |
| --- | --- | --- |
PLAN

cat > "$research_dir/findings.md" <<FINDINGS
---
type: research_findings
project: $project_slug
slug: $research_slug
created: $now
updated: $now
---

# Findings: $title

## Source References

- <source, file, command, or artifact inspected>

## Observations

- <finding>

## Options Considered

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |

## Fold-Forward Candidates

| Finding | Target Artifact | Proposed Change |
| --- | --- | --- |

## Open Questions

- <question>
FINDINGS

cat > "$research_dir/progress.md" <<PROGRESS
---
type: research_progress
project: $project_slug
slug: $research_slug
created: $now
updated: $now
---

# Progress: $title

## $now

- Opened research intake for project \`$project_slug\`.
- Primary question: $question

## Validation Evidence

- Pending.

## Handoff Summary

- Pending.
PROGRESS

validation_status="skipped"
ok="true"
error=""
if [[ "$validate" == "true" ]]; then
  if [[ "$json" == "true" ]]; then
    validation_log="$(mktemp)"
    if "$root/.agents/scripts/pm/validate.sh" >"$validation_log" 2>&1; then
      validation_status="passed"
    else
      validation_status="failed"
      ok="false"
      error="validation_failed"
    fi
    rm -f "$validation_log"
  else
    "$root/.agents/scripts/pm/validate.sh"
    validation_status="passed"
  fi
fi

if [[ "$json" == "true" ]]; then
  project_json="$(printf '%s' "$project_dir" | json_escape)"
  research_json="$(printf '%s' "$research_dir" | json_escape)"
  validation_json="$(printf '%s' "$validation_status" | json_escape)"
  if [[ "$ok" == "true" ]]; then
    printf '{"ok":true,"command":"research","project":%s,"research":%s,"files":["task_plan.md","findings.md","progress.md"],"validation":%s}\n' "$project_json" "$research_json" "$validation_json"
  else
    error_json="$(printf '%s' "$error" | json_escape)"
    printf '{"ok":false,"command":"research","project":%s,"research":%s,"files":["task_plan.md","findings.md","progress.md"],"validation":%s,"error":%s}\n' "$project_json" "$research_json" "$validation_json" "$error_json"
    exit 1
  fi
else
  echo "Created Delano research intake: $research_dir"
  echo "Files: task_plan.md, findings.md, progress.md"
  echo "Validation: $validation_status"
  echo "Next: update findings.md and progress.md, then fold conclusions into canonical Delano artifacts."
fi
