#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$root"

open_only=false
brief=false

usage() {
  cat <<'EOF'
Usage:
  status.sh [--open] [--brief]

Options:
  --open   Show only projects that are not closed.
  --brief  Show one compact line per project.
  -h, --help
           Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --open)
      open_only=true
      ;;
    --brief)
      brief=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown status option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

fm_get() {
  local file="$1"
  local key="$2"
  local line
  local in_fm=0
  while IFS= read -r line; do
    if [[ "$line" =~ ^---[[:space:]]*$ ]]; then
      if [[ $in_fm -eq 0 ]]; then
        in_fm=1
        continue
      fi
      return 1
    fi

    if [[ $in_fm -eq 1 && "$line" == "$key:"* ]]; then
      local value="${line#"$key:"}"
      value="${value#"${value%%[![:space:]]*}"}"
      printf '%s\n' "$value"
      return 0
    fi
  done < "$file"
  return 1
}

is_closed_spec_status() {
  local status="${1:-unknown}"
  [[ "$status" == "complete" || "$status" == "deferred" ]]
}

is_closed_plan_status() {
  local status="${1:-unknown}"
  [[ "$status" == "done" || "$status" == "deferred" ]]
}

is_closed_task_status() {
  local status="${1:-unknown}"
  [[ "$status" == "done" || "$status" == "deferred" || "$status" == "canceled" ]]
}

if [[ "$open_only" == "true" ]]; then
  echo "Delano open project status"
  echo "=========================="
else
  echo "Delano portfolio status"
  echo "======================="
fi

project_count=0
printed_count=0
for project_dir in .project/projects/*; do
  [[ -d "$project_dir" ]] || continue
  [[ "$(basename "$project_dir")" == ".gitkeep" ]] && continue
  project_count=$((project_count + 1))

  slug="$(basename "$project_dir")"
  spec_status="$(fm_get "$project_dir/spec.md" status 2>/dev/null || true)"
  plan_status="$(fm_get "$project_dir/plan.md" status 2>/dev/null || true)"

  total=0
  open_tasks=0
  backlog_count=0
  ready_count=0
  in_progress_count=0
  review_count=0
  done_count=0
  blocked_count=0
  deferred_count=0
  canceled_count=0
  unknown_count=0
  for task in "$project_dir"/tasks/*.md; do
    [[ -f "$task" ]] || continue
    status="$(fm_get "$task" status 2>/dev/null || true)"
    total=$((total + 1))
    if ! is_closed_task_status "$status"; then
      open_tasks=$((open_tasks + 1))
    fi
    case "$status" in
      backlog) backlog_count=$((backlog_count + 1)) ;;
      ready) ready_count=$((ready_count + 1)) ;;
      in-progress) in_progress_count=$((in_progress_count + 1)) ;;
      review) review_count=$((review_count + 1)) ;;
      done) done_count=$((done_count + 1)) ;;
      blocked) blocked_count=$((blocked_count + 1)) ;;
      deferred) deferred_count=$((deferred_count + 1)) ;;
      canceled) canceled_count=$((canceled_count + 1)) ;;
      *) unknown_count=$((unknown_count + 1)) ;;
    esac
  done

  project_open=false
  if ! is_closed_spec_status "$spec_status" || ! is_closed_plan_status "$plan_status" || [[ $open_tasks -gt 0 ]]; then
    project_open=true
  fi

  if [[ "$open_only" == "true" && "$project_open" != "true" ]]; then
    continue
  fi

  printed_count=$((printed_count + 1))

  if [[ "$brief" == "true" ]]; then
    echo "${slug}  spec=${spec_status:-unknown} plan=${plan_status:-unknown} open_tasks=${open_tasks} total_tasks=${total}"
  else
    echo ""
    echo "Project: $slug"
    echo "  Spec status: ${spec_status:-unknown}"
    echo "  Plan status: ${plan_status:-unknown}"
    [[ $backlog_count -gt 0 ]] && echo "  backlog: $backlog_count"
    [[ $ready_count -gt 0 ]] && echo "  ready: $ready_count"
    [[ $in_progress_count -gt 0 ]] && echo "  in-progress: $in_progress_count"
    [[ $review_count -gt 0 ]] && echo "  review: $review_count"
    [[ $done_count -gt 0 ]] && echo "  done: $done_count"
    [[ $blocked_count -gt 0 ]] && echo "  blocked: $blocked_count"
    [[ $deferred_count -gt 0 ]] && echo "  deferred: $deferred_count"
    [[ $canceled_count -gt 0 ]] && echo "  canceled: $canceled_count"
    [[ $unknown_count -gt 0 ]] && echo "  unknown: $unknown_count"
    echo "  total tasks: $total"
  fi
done

if [[ $project_count -eq 0 ]]; then
  echo "No projects found. Create one with: .agents/scripts/pm/init.sh <slug> <project-name>"
elif [[ "$open_only" == "true" && $printed_count -eq 0 ]]; then
  echo "No open projects found."
fi
