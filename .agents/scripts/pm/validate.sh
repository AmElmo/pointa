#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$root"

errors=0
warnings=0

check_required_path() {
  local path="$1"
  if [[ -e "$path" ]]; then
    echo "✅ $path"
  else
    echo "❌ Missing: $path"
    errors=$((errors + 1))
  fi
}

fm_get() {
  local file="$1"
  local key="$2"
  awk -v key="$key" '
    BEGIN {in_fm=0}
    /^---[[:space:]]*$/ {if (in_fm==0) {in_fm=1; next} else {exit}}
    in_fm==1 && $0 ~ "^" key ":[[:space:]]*" {
      sub("^" key ":[[:space:]]*", "")
      print
      exit
    }
  ' "$file"
}

has_frontmatter() {
  local file="$1"
  [[ "$(awk 'NR==1 && /^---[[:space:]]*$/ {print "yes"}' "$file")" == "yes" ]]
}

is_iso_utc() {
  local ts="$1"
  [[ "$ts" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]]
}

contains_value() {
  local needle="$1"
  shift
  local item
  for item in "$@"; do
    [[ "$item" == "$needle" ]] && return 0
  done
  return 1
}

python_cmd=()
node_cmd=()

resolve_python_cmd() {
  if command -v python3 >/dev/null 2>&1 && python3 -c "import sys" >/dev/null 2>&1; then
    python_cmd=(python3)
    return 0
  fi

  if command -v py >/dev/null 2>&1 && py -3 -c "import sys" >/dev/null 2>&1; then
    python_cmd=(py -3)
    return 0
  fi

  if command -v python >/dev/null 2>&1 && python -c "import sys" >/dev/null 2>&1; then
    python_cmd=(python)
    return 0
  fi

  return 1
}

resolve_node_cmd() {
  if command -v node >/dev/null 2>&1 && node -e "process.exit(0)" >/dev/null 2>&1; then
    node_cmd=(node)
    return 0
  fi

  if command -v node.exe >/dev/null 2>&1 && node.exe -e "process.exit(0)" >/dev/null 2>&1; then
    node_cmd=(node.exe)
    return 0
  fi

  if command -v powershell.exe >/dev/null 2>&1; then
    local win_node
    win_node="$(powershell.exe -NoProfile -Command "(Get-Command node -ErrorAction SilentlyContinue).Source" 2>/dev/null | tr -d '\r' | head -n 1)"
    if [[ -n "$win_node" ]]; then
      local unix_node="$win_node"
      if command -v cygpath >/dev/null 2>&1; then
        unix_node="$(cygpath -u "$win_node")"
      else
        unix_node="${unix_node//\\//}"
        if [[ "$unix_node" =~ ^([A-Za-z]):/(.*)$ ]]; then
          unix_node="/${BASH_REMATCH[1],,}/${BASH_REMATCH[2]}"
        fi
      fi
      if [[ -x "$unix_node" ]]; then
        node_cmd=("$unix_node")
        return 0
      fi
    fi
  fi

  return 1
}

echo "Delano validation"
echo "================="

check_required_path ".project/projects"
check_required_path ".project/context"
check_required_path ".project/registry/linear-map.json"
check_required_path ".agents/scripts/pm"
check_required_path ".agents/rules"
check_required_path ".agents/hooks"
check_required_path ".agents/logs"
check_required_path ".agents/skills"

if [[ -e ".claude" || -L ".claude" ]]; then
  echo "✅ Compatibility runtime present: .claude"
else
  echo "⚠️ Compatibility runtime missing: .claude (canonical .agents is sufficient)"
  warnings=$((warnings + 1))
fi

if resolve_python_cmd; then
  echo "✅ Python runtime: ${python_cmd[*]}"
else
  echo "❌ Python runtime not found (tried: python3, py -3, python)"
  errors=$((errors + 1))
fi

if resolve_node_cmd; then
  if ! command -v node >/dev/null 2>&1; then
    node() {
      "${node_cmd[@]}" "$@"
    }
  fi
  echo "Node runtime: ${node_cmd[*]}"
else
  echo "Node runtime not found (tried: node, node.exe, PowerShell Get-Command node)"
fi

# Required skill contracts
required_skills=(
  discovery-skill
  research-skill
  prototype-skill
  planning-skill
  breakdown-skill
  sync-skill
  execution-skill
  quality-skill
  closeout-skill
  learning-skill
)

echo ""
echo "Required skills"
echo "---------------"
for skill in "${required_skills[@]}"; do
  skill_dir=".agents/skills/$skill"
  skill_file="$skill_dir/SKILL.md"

  if [[ -f "$skill_file" ]]; then
    echo "✅ $skill_file"
  else
    echo "❌ Missing skill contract: $skill_file"
    errors=$((errors + 1))
    continue
  fi

  runbook="$skill_dir/references/runbook.md"
  if [[ -f "$runbook" ]]; then
    echo "✅ $runbook"
  else
    echo "❌ Missing skill runbook: $runbook"
    errors=$((errors + 1))
  fi

  template_count=0
  if [[ -d "$skill_dir/templates" ]]; then
    template_count=$(find "$skill_dir/templates" -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' ')
  fi

  if [[ "$template_count" -ge 2 ]]; then
    echo "✅ $skill_dir/templates ($template_count files)"
  else
    echo "❌ Skill needs at least 2 templates: $skill_dir/templates"
    errors=$((errors + 1))
  fi

  if grep -q '^## Execution assets' "$skill_file"; then
    echo "✅ $skill_file includes execution assets section"
  else
    echo "❌ $skill_file missing execution assets section"
    errors=$((errors + 1))
  fi
done

# Project contract validation
for project_dir in .project/projects/*; do
  [[ -d "$project_dir" ]] || continue
  [[ "$(basename "$project_dir")" == ".gitkeep" ]] && continue

  echo ""
  echo "Project: $(basename "$project_dir")"

  for path in spec.md plan.md decisions.md tasks workstreams updates; do
    if [[ ! -e "$project_dir/$path" ]]; then
      echo "  ❌ Missing $path"
      errors=$((errors + 1))
    fi
  done

  spec="$project_dir/spec.md"
  if [[ -f "$spec" ]]; then
    if ! has_frontmatter "$spec"; then
      echo "  ❌ spec.md missing frontmatter"
      errors=$((errors + 1))
    fi
    for key in name slug owner status created updated outcome uncertainty probe_required probe_status; do
      val="$(fm_get "$spec" "$key")"
      if [[ -z "$val" ]]; then
        echo "  ❌ spec.md missing key: $key"
        errors=$((errors + 1))
      fi
    done
    for key in created updated; do
      val="$(fm_get "$spec" "$key")"
      if [[ -n "$val" ]] && ! is_iso_utc "$val"; then
        echo "  ❌ spec.md $key must be ISO8601 UTC"
        errors=$((errors + 1))
      fi
    done
  fi

  plan="$project_dir/plan.md"
  if [[ -f "$plan" ]]; then
    if ! has_frontmatter "$plan"; then
      echo "  ❌ plan.md missing frontmatter"
      errors=$((errors + 1))
    fi
    for key in name status lead created updated linear_project_id risk_level spec_status_at_plan_time; do
      val="$(fm_get "$plan" "$key")"
      if [[ -z "$val" && "$key" != "linear_project_id" ]]; then
        echo "  ❌ plan.md missing key: $key"
        errors=$((errors + 1))
      fi
    done
    for key in created updated; do
      val="$(fm_get "$plan" "$key")"
      if [[ -n "$val" ]] && ! is_iso_utc "$val"; then
        echo "  ❌ plan.md $key must be ISO8601 UTC"
        errors=$((errors + 1))
      fi
    done
  fi

  workstream_ids=()
  for workstream in "$project_dir"/workstreams/*.md; do
    [[ -f "$workstream" ]] || continue
    workstream_file="$(basename "$workstream" .md)"
    if [[ "$workstream_file" =~ ^(WS-[A-Za-z0-9]+) ]]; then
      workstream_ids+=("${BASH_REMATCH[1]}")
    fi
  done

  for task in "$project_dir"/tasks/*.md; do
    [[ -f "$task" ]] || continue
    if ! has_frontmatter "$task"; then
      echo "  ❌ $(basename "$task") missing frontmatter"
      errors=$((errors + 1))
      continue
    fi
    for key in id name status workstream created updated linear_issue_id github_issue github_pr depends_on conflicts_with parallel priority estimate; do
      val="$(fm_get "$task" "$key")"
      if [[ -z "$val" && ! "$key" =~ ^(linear_issue_id|github_issue|github_pr|depends_on|conflicts_with)$ ]]; then
        echo "  ❌ $(basename "$task") missing key: $key"
        errors=$((errors + 1))
      fi
    done
    task_workstream="$(fm_get "$task" "workstream")"
    if [[ -n "$task_workstream" ]]; then
      if [[ ! "$task_workstream" =~ ^WS-[A-Za-z0-9]+$ ]]; then
        echo "  ❌ $(basename "$task") workstream must use canonical form like WS-A"
        errors=$((errors + 1))
      elif ! contains_value "$task_workstream" "${workstream_ids[@]}"; then
        echo "  ❌ $(basename "$task") workstream does not match a project workstream: $task_workstream"
        errors=$((errors + 1))
      fi
    fi
  done

  # dependency cycle check for this project
  if [[ ${#python_cmd[@]} -gt 0 ]]; then
    "${python_cmd[@]}" - "$project_dir" <<'PY' || errors=$((errors + 1))
import sys, re
from pathlib import Path

project = Path(sys.argv[1])
tasks = {}

def parse_frontmatter(path: Path):
    text = path.read_text(encoding='utf-8')
    m = re.match(r'^---\n(.*?)\n---\n', text, re.S)
    if not m:
        return {}
    data = {}
    for line in m.group(1).splitlines():
        if ':' not in line:
            continue
        k, v = line.split(':', 1)
        data[k.strip()] = v.strip()
    return data

for f in sorted((project / 'tasks').glob('*.md')):
    meta = parse_frontmatter(f)
    tid = meta.get('id') or f.stem
    raw = meta.get('depends_on', '[]').strip()
    deps = []
    if raw.startswith('[') and raw.endswith(']'):
        inner = raw[1:-1].strip()
        if inner:
            deps = [x.strip().strip('"\'') for x in inner.split(',') if x.strip()]
    tasks[tid] = deps

visited = {}

def dfs(node, stack):
    state = visited.get(node, 0)
    if state == 1:
        cycle = ' -> '.join(stack + [node])
        raise RuntimeError(f'dependency cycle: {cycle}')
    if state == 2:
        return
    visited[node] = 1
    for dep in tasks.get(node, []):
        if dep in tasks:
            dfs(dep, stack + [node])
    visited[node] = 2

for t in tasks:
    dfs(t, [])
print('  [ok] dependency graph acyclic')
PY
  fi

done

# Absolute path leakage check (documentation and contract files only)
path_tmp="$(mktemp)"
trap 'rm -f "$path_tmp"' EXIT

compat_paths=()
if [[ -e .claude || -L .claude ]]; then
  compat_paths+=(.claude)
fi

if find .project .agents "${compat_paths[@]}" \
  -type f \
  \( -name '*.md' -o -name '*.json' -o -name '*.yaml' -o -name '*.yml' \) \
  -not -path '.agents/logs/*' \
  -not -path '.claude/logs/*' \
  -print0 | xargs -0 grep -nE '(/home/|/Users/|/mnt/[A-Za-z]/|[A-Za-z]:\\)' >"$path_tmp" 2>/dev/null; then
  echo ""
  echo "❌ Absolute path leakage found"
  head -n 20 "$path_tmp"
  errors=$((errors + 1))
else
  echo ""
  echo "✅ No absolute path leakage in tracked docs and contracts"
fi

if [[ -x .agents/scripts/check-log-safety.sh ]]; then
  echo ""
  if .agents/scripts/check-log-safety.sh; then
    true
  else
    errors=$((errors + 1))
  fi
fi

text_safety_check=""
if [[ -f .agents/scripts/check-text-safety.mjs ]]; then
  text_safety_check=".agents/scripts/check-text-safety.mjs"
elif [[ -f scripts/check-text-safety.mjs ]]; then
  text_safety_check="scripts/check-text-safety.mjs"
fi

if [[ -n "$text_safety_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$text_safety_check"; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for text safety check"
    errors=$((errors + 1))
  fi
fi

if [[ -f scripts/check-package-manifest-drift.mjs ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node scripts/check-package-manifest-drift.mjs; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for package/manifest drift check"
    errors=$((errors + 1))
  fi
fi

if [[ -f scripts/check-agent-entry-docs.mjs ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node scripts/check-agent-entry-docs.mjs; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for agent entry doc check"
    errors=$((errors + 1))
  fi
fi

if [[ -f scripts/check-artifact-scope.mjs ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node scripts/check-artifact-scope.mjs; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for artifact scope check"
    errors=$((errors + 1))
  fi
fi

artifact_schema_check=""
if [[ -f .agents/scripts/check-artifact-schemas.mjs ]]; then
  artifact_schema_check=".agents/scripts/check-artifact-schemas.mjs"
elif [[ -f scripts/check-artifact-schemas.mjs ]]; then
  artifact_schema_check="scripts/check-artifact-schemas.mjs"
fi

if [[ -n "$artifact_schema_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$artifact_schema_check"; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for artifact schema check"
    errors=$((errors + 1))
  fi
fi

if [[ -f scripts/check-adapter-manifests.mjs ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node scripts/check-adapter-manifests.mjs; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for adapter manifest check"
    errors=$((errors + 1))
  fi
fi

operating_modes_check=""
if [[ -f .agents/scripts/check-operating-modes.mjs ]]; then
  operating_modes_check=".agents/scripts/check-operating-modes.mjs"
elif [[ -f scripts/check-operating-modes.mjs ]]; then
  operating_modes_check="scripts/check-operating-modes.mjs"
fi

if [[ -n "$operating_modes_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$operating_modes_check"; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for operating modes check"
    errors=$((errors + 1))
  fi
fi

status_transition_check=""
if [[ -f .agents/scripts/check-status-transitions.mjs ]]; then
  status_transition_check=".agents/scripts/check-status-transitions.mjs"
elif [[ -f scripts/check-status-transitions.mjs ]]; then
  status_transition_check="scripts/check-status-transitions.mjs"
fi

if [[ -n "$status_transition_check" ]]; then
  echo ""
  echo "Project lifecycle and status transition check"
  echo "---------------------------------------------"
  if command -v node >/dev/null 2>&1; then
    if node "$status_transition_check"; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for status transition check"
    errors=$((errors + 1))
  fi
fi

evidence_map_check=""
if [[ -f .agents/scripts/check-evidence-map.mjs ]]; then
  evidence_map_check=".agents/scripts/check-evidence-map.mjs"
elif [[ -f scripts/check-evidence-map.mjs ]]; then
  evidence_map_check="scripts/check-evidence-map.mjs"
fi

if [[ -n "$evidence_map_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$evidence_map_check"; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for evidence map check"
    errors=$((errors + 1))
  fi
fi

strict_fixtures_check=""
if [[ -f .agents/scripts/check-strict-fixtures.mjs ]]; then
  strict_fixtures_check=".agents/scripts/check-strict-fixtures.mjs"
elif [[ -f scripts/check-strict-fixtures.mjs ]]; then
  strict_fixtures_check="scripts/check-strict-fixtures.mjs"
fi

if [[ -n "$strict_fixtures_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$strict_fixtures_check"; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for strict fixtures check"
    errors=$((errors + 1))
  fi
fi

sync_schema_check=""
if [[ -f .agents/scripts/check-sync-schemas.mjs ]]; then
  sync_schema_check=".agents/scripts/check-sync-schemas.mjs"
elif [[ -f scripts/check-sync-schemas.mjs ]]; then
  sync_schema_check="scripts/check-sync-schemas.mjs"
fi

if [[ -n "$sync_schema_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$sync_schema_check"; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for sync schema check"
    errors=$((errors + 1))
  fi
fi

local_sync_map_check=""
if [[ -f .agents/scripts/check-local-sync-map.mjs ]]; then
  local_sync_map_check=".agents/scripts/check-local-sync-map.mjs"
elif [[ -f scripts/check-local-sync-map.mjs ]]; then
  local_sync_map_check="scripts/check-local-sync-map.mjs"
fi

if [[ -n "$local_sync_map_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$local_sync_map_check"; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for local sync map check"
    errors=$((errors + 1))
  fi
fi

github_sync_check=""
if [[ -f .agents/scripts/check-github-sync.mjs ]]; then
  github_sync_check=".agents/scripts/check-github-sync.mjs"
elif [[ -f scripts/check-github-sync.mjs ]]; then
  github_sync_check="scripts/check-github-sync.mjs"
fi

if [[ -n "$github_sync_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$github_sync_check"; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for GitHub sync inspection"
    errors=$((errors + 1))
  fi
fi

local_sync_map_check=""
if [[ -f .agents/scripts/read-local-sync-map.mjs ]]; then
  local_sync_map_check=".agents/scripts/read-local-sync-map.mjs"
elif [[ -f scripts/read-local-sync-map.mjs ]]; then
  local_sync_map_check="scripts/read-local-sync-map.mjs"
fi

if [[ -n "$local_sync_map_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$local_sync_map_check"; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for local sync map check"
    errors=$((errors + 1))
  fi
fi

github_sync_check=""
if [[ -f .agents/scripts/inspect-github-sync.mjs ]]; then
  github_sync_check=".agents/scripts/inspect-github-sync.mjs"
elif [[ -f scripts/inspect-github-sync.mjs ]]; then
  github_sync_check="scripts/inspect-github-sync.mjs"
fi

if [[ -n "$github_sync_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$github_sync_check"; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for GitHub sync inspection"
    errors=$((errors + 1))
  fi
fi

github_status_check=""
if [[ -f .agents/scripts/check-github-status-inspection.mjs ]]; then
  github_status_check=".agents/scripts/check-github-status-inspection.mjs"
elif [[ -f scripts/check-github-status-inspection.mjs ]]; then
  github_status_check="scripts/check-github-status-inspection.mjs"
fi

if [[ -n "$github_status_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$github_status_check"; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for GitHub status inspection"
    errors=$((errors + 1))
  fi
fi

linear_issue_check=""
if [[ -f .agents/scripts/check-linear-issue-inspection.mjs ]]; then
  linear_issue_check=".agents/scripts/check-linear-issue-inspection.mjs"
elif [[ -f scripts/check-linear-issue-inspection.mjs ]]; then
  linear_issue_check="scripts/check-linear-issue-inspection.mjs"
fi

if [[ -n "$linear_issue_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$linear_issue_check"; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for Linear issue inspection"
    errors=$((errors + 1))
  fi
fi

drift_report_check=""
if [[ -f .agents/scripts/build-drift-report.mjs ]]; then
  drift_report_check=".agents/scripts/build-drift-report.mjs"
elif [[ -f scripts/build-drift-report.mjs ]]; then
  drift_report_check="scripts/build-drift-report.mjs"
fi

if [[ -n "$drift_report_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$drift_report_check"; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for dry-run drift report"
    errors=$((errors + 1))
  fi
fi

repair_plan_check=""
if [[ -f .agents/scripts/plan-sync-repairs.mjs ]]; then
  repair_plan_check=".agents/scripts/plan-sync-repairs.mjs"
elif [[ -f scripts/plan-sync-repairs.mjs ]]; then
  repair_plan_check="scripts/plan-sync-repairs.mjs"
fi

if [[ -n "$repair_plan_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$repair_plan_check"; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for sync repair planning"
    errors=$((errors + 1))
  fi
fi

lease_contract_check=""
if [[ -f .agents/scripts/check-lease-contracts.mjs ]]; then
  lease_contract_check=".agents/scripts/check-lease-contracts.mjs"
elif [[ -f scripts/check-lease-contracts.mjs ]]; then
  lease_contract_check="scripts/check-lease-contracts.mjs"
fi

if [[ -n "$lease_contract_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$lease_contract_check"; then true; else errors=$((errors + 1)); fi
  else
    echo "❌ Node runtime not found for lease contract check"; errors=$((errors + 1))
  fi
fi

lease_manager_check=""
if [[ -f .agents/scripts/lease-manager.mjs ]]; then
  lease_manager_check=".agents/scripts/lease-manager.mjs"
elif [[ -f scripts/lease-manager.mjs ]]; then
  lease_manager_check="scripts/lease-manager.mjs"
fi

if [[ -n "$lease_manager_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$lease_manager_check" self-test; then true; else errors=$((errors + 1)); fi
  else
    echo "❌ Node runtime not found for lease manager check"; errors=$((errors + 1))
  fi
fi

lease_conflict_check=""
if [[ -f .agents/scripts/check-lease-conflicts.mjs ]]; then
  lease_conflict_check=".agents/scripts/check-lease-conflicts.mjs"
elif [[ -f scripts/check-lease-conflicts.mjs ]]; then
  lease_conflict_check="scripts/check-lease-conflicts.mjs"
fi

if [[ -n "$lease_conflict_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$lease_conflict_check" --zone scripts/lease-manager.mjs --mode exclusive; then true; else errors=$((errors + 1)); fi
  else
    echo "❌ Node runtime not found for lease conflict check"; errors=$((errors + 1))
  fi
fi

next_task_check=""
if [[ -f .agents/scripts/select-next-task.mjs ]]; then
  next_task_check=".agents/scripts/select-next-task.mjs"
elif [[ -f scripts/select-next-task.mjs ]]; then
  next_task_check="scripts/select-next-task.mjs"
fi

if [[ -n "$next_task_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$next_task_check" --project delano-multi-agent-execution --stream default; then true; else errors=$((errors + 1)); fi
  else
    echo "❌ Node runtime not found for next task selection check"; errors=$((errors + 1))
  fi
fi

worktree_health_check=""
if [[ -f .agents/scripts/check-worktree-health.mjs ]]; then
  worktree_health_check=".agents/scripts/check-worktree-health.mjs"
elif [[ -f scripts/check-worktree-health.mjs ]]; then
  worktree_health_check="scripts/check-worktree-health.mjs"
fi

if [[ -n "$worktree_health_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$worktree_health_check"; then true; else errors=$((errors + 1)); fi
  else
    echo "❌ Node runtime not found for worktree health check"; errors=$((errors + 1))
  fi
fi

delivery_metrics_check=""
if [[ -f .agents/scripts/check-delivery-metric-events.mjs ]]; then
  delivery_metrics_check=".agents/scripts/check-delivery-metric-events.mjs"
elif [[ -f scripts/check-delivery-metric-events.mjs ]]; then
  delivery_metrics_check="scripts/check-delivery-metric-events.mjs"
fi

if [[ -n "$delivery_metrics_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$delivery_metrics_check"; then true; else errors=$((errors + 1)); fi
  else
    echo "❌ Node runtime not found for delivery metrics check"; errors=$((errors + 1))
  fi
fi

handoff_summary_check=""
if [[ -f .agents/scripts/check-handoff-summaries.mjs ]]; then
  handoff_summary_check=".agents/scripts/check-handoff-summaries.mjs"
elif [[ -f scripts/check-handoff-summaries.mjs ]]; then
  handoff_summary_check="scripts/check-handoff-summaries.mjs"
fi

if [[ -n "$handoff_summary_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$handoff_summary_check" --self-test; then true; else errors=$((errors + 1)); fi
  else
    echo "❌ Node runtime not found for handoff summary check"; errors=$((errors + 1))
  fi
fi

delivery_metrics_check=""
if [[ -f .agents/scripts/check-delivery-metrics.mjs ]]; then
  delivery_metrics_check=".agents/scripts/check-delivery-metrics.mjs"
elif [[ -f scripts/check-delivery-metrics.mjs ]]; then
  delivery_metrics_check="scripts/check-delivery-metrics.mjs"
fi

if [[ -n "$delivery_metrics_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$delivery_metrics_check"; then
      true
    else
      errors=$((errors + 1))
    fi
  else
    echo "❌ Node runtime not found for delivery metric event check"
    errors=$((errors + 1))
  fi
fi

project_metrics_check=""
if [[ -f .agents/scripts/summarize-project-metrics.mjs ]]; then
  project_metrics_check=".agents/scripts/summarize-project-metrics.mjs"
elif [[ -f scripts/summarize-project-metrics.mjs ]]; then
  project_metrics_check="scripts/summarize-project-metrics.mjs"
fi

if [[ -n "$project_metrics_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$project_metrics_check" --json >/dev/null; then true; else errors=$((errors + 1)); fi
  else
    echo "❌ Node runtime not found for project metrics summary"; errors=$((errors + 1))
  fi
fi

context_audit_check=""
if [[ -f .agents/scripts/audit-context-scoring.mjs ]]; then
  context_audit_check=".agents/scripts/audit-context-scoring.mjs"
elif [[ -f scripts/audit-context-scoring.mjs ]]; then
  context_audit_check="scripts/audit-context-scoring.mjs"
fi

if [[ -n "$context_audit_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$context_audit_check"; then true; else errors=$((errors + 1)); fi
  else
    echo "❌ Node runtime not found for context audit scoring"; errors=$((errors + 1))
  fi
fi

skill_eval_check=""
if [[ -f .agents/scripts/check-skill-output-evals.mjs ]]; then
  skill_eval_check=".agents/scripts/check-skill-output-evals.mjs"
elif [[ -f scripts/check-skill-output-evals.mjs ]]; then
  skill_eval_check="scripts/check-skill-output-evals.mjs"
fi

if [[ -n "$skill_eval_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$skill_eval_check"; then true; else errors=$((errors + 1)); fi
  else
    echo "❌ Node runtime not found for skill output evals"; errors=$((errors + 1))
  fi
fi

closeout_learning_check=""
if [[ -f .agents/scripts/propose-closeout-learning.mjs ]]; then
  closeout_learning_check=".agents/scripts/propose-closeout-learning.mjs"
elif [[ -f scripts/propose-closeout-learning.mjs ]]; then
  closeout_learning_check="scripts/propose-closeout-learning.mjs"
fi

if [[ -n "$closeout_learning_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$closeout_learning_check" --json >/dev/null; then true; else errors=$((errors + 1)); fi
  else
    echo "❌ Node runtime not found for closeout learning proposal"; errors=$((errors + 1))
  fi
fi

closeout_learning_proposal_check=""
if [[ -f .agents/scripts/check-closeout-learning-proposals.mjs ]]; then
  closeout_learning_proposal_check=".agents/scripts/check-closeout-learning-proposals.mjs"
elif [[ -f scripts/check-closeout-learning-proposals.mjs ]]; then
  closeout_learning_proposal_check="scripts/check-closeout-learning-proposals.mjs"
fi

if [[ -n "$closeout_learning_proposal_check" ]]; then
  echo ""
  if command -v node >/dev/null 2>&1; then
    if node "$closeout_learning_proposal_check"; then true; else errors=$((errors + 1)); fi
  else
    echo "❌ Node runtime not found for closeout learning proposal check"; errors=$((errors + 1))
  fi
fi

echo ""
echo "Summary"
echo "-------"
echo "Errors: $errors"
echo "Warnings: $warnings"

if [[ $errors -gt 0 ]]; then
  exit 1
fi
