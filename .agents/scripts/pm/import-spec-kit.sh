#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  import-spec-kit.sh <slug> <source-md> [options]
  import-spec-kit.sh <slug> <source-md> [project-name] [owner] [lead]

Creates a planned Delano project from the first supported Spec Kit-style markdown fixture.

Required arguments:
  slug                  Target Delano project slug in kebab-case
  source-md             Path to a markdown source artifact

Options:
  --name <project-name>  Project name override
  --owner <owner>        Project owner, defaults to team
  --lead <lead>          Project lead, defaults to owner
  --no-validate          Create artifacts without running Delano validation
  --json                 Print a single machine-readable JSON result
  -h, --help             Show this help

Agent notes:
  - Prefer named options over positional metadata.
  - Use --json when another agent/tool will parse the result.
  - The command refuses to overwrite an existing .project/projects/<slug>/ folder.
  - Generated artifacts stay planned/ready and still require Delano evidence gates.
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

slug="$1"
source_md="$2"
shift 2

project_name=""
owner="team"
lead=""
validate="true"
json="false"
positional=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name)
      project_name="${2:-}"
      if [[ -z "$project_name" ]]; then echo "Error: --name requires a value"; exit 1; fi
      shift 2
      ;;
    --owner)
      owner="${2:-}"
      if [[ -z "$owner" ]]; then echo "Error: --owner requires a value"; exit 1; fi
      shift 2
      ;;
    --lead)
      lead="${2:-}"
      if [[ -z "$lead" ]]; then echo "Error: --lead requires a value"; exit 1; fi
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
      while [[ $# -gt 0 ]]; do positional+=("$1"); shift; done
      ;;
    --*)
      echo "Error: unknown option: $1"
      exit 1
      ;;
    *)
      positional+=("$1")
      shift
      ;;
  esac
done

# Backward-compatible positional metadata: [project-name] [owner] [lead].
if [[ ${#positional[@]} -gt 0 && -z "$project_name" ]]; then
  project_name="${positional[0]}"
fi
if [[ ${#positional[@]} -gt 1 && "$owner" == "team" ]]; then
  owner="${positional[1]}"
fi
if [[ ${#positional[@]} -gt 2 && -z "$lead" ]]; then
  lead="${positional[2]}"
fi
if [[ ${#positional[@]} -gt 3 ]]; then
  echo "Error: too many positional arguments"
  exit 1
fi

lead="${lead:-$owner}"

if [[ ! "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Error: slug must be kebab-case"
  exit 1
fi

invocation_cwd="$PWD"
root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
if [[ "$source_md" != /* ]]; then
  source_md="$invocation_cwd/$source_md"
fi
cd "$root"

if [[ ! -f "$source_md" ]]; then
  echo "Error: source markdown not found: $source_md"
  exit 1
fi

project_dir=".project/projects/$slug"
if [[ -d "$project_dir" ]]; then
  echo "Error: project already exists at $project_dir"
  exit 1
fi

"${PYTHON_CMD[@]}" - "$slug" "$source_md" "$project_name" "$owner" "$lead" <<'PY'
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

slug, source_arg, project_name_arg, owner, lead = sys.argv[1:]
source_path = Path(source_arg)
root = Path.cwd()
source_text = source_path.read_text(encoding="utf-8")
now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
today = now[:10]

def write_file(path, text):
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)

heading_match = re.search(r"^#\s+(?:Specification|Spec):\s+(.+?)\s*$", source_text, re.MULTILINE | re.IGNORECASE)
if project_name_arg:
    project_name = project_name_arg.strip()
elif heading_match:
    project_name = heading_match.group(1).strip()
else:
    project_name = slug.replace("-", " ").title()

sections = {}
current = None
for line in source_text.splitlines():
    match = re.match(r"^##\s+(.+?)\s*$", line)
    if match:
        current = match.group(1).strip().lower()
        sections[current] = []
        continue
    if current:
        sections[current].append(line)

for key in list(sections):
    sections[key] = "\n".join(sections[key]).strip()

def section(*names):
    for name in names:
        value = sections.get(name.lower())
        if value:
            return value
    return ""

def bullet_lines(text):
    items = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("- "):
            items.append(stripped)
    return items

user_stories = bullet_lines(section("User Stories"))
acceptance = bullet_lines(section("Acceptance Scenarios"))
requirements = bullet_lines(section("Requirements"))
non_functional = bullet_lines(section("Non-Functional Requirements"))
assumptions = bullet_lines(section("Assumptions"))
clarifications = bullet_lines(section("Clarifications", "Needs Clarification"))
implementation_plan = bullet_lines(section("Implementation Plan"))
raw_tasks = bullet_lines(section("Tasks"))

recognized_content = user_stories + acceptance + requirements + non_functional + assumptions + clarifications + implementation_plan + raw_tasks
if not recognized_content:
    raise SystemExit("unsupported Spec Kit-style source: expected at least one recognized section such as User Stories, Acceptance Scenarios, Requirements, Implementation Plan, or Tasks")

project_dir = root / ".project" / "projects" / slug
(project_dir / "tasks").mkdir(parents=True)
(project_dir / "workstreams").mkdir()
(project_dir / "updates").mkdir()

source_display = source_path.as_posix()
if source_path.is_absolute():
    try:
        source_display = source_path.resolve().relative_to(root).as_posix()
    except ValueError:
        source_display = "external markdown source"

def md_list(items, fallback="- None recorded."):
    return "\n".join(items) if items else fallback

def yaml_scalar(value):
    return str(value).replace("\n", " ").replace(":", " -")

spec = f"""---
name: {yaml_scalar(project_name)}
slug: {slug}
owner: {yaml_scalar(owner)}
status: planned
created: {now}
updated: {now}
outcome: Imported Spec Kit-style intent is normalized into Delano delivery contracts and validated before execution.
uncertainty: medium
probe_required: true
probe_status: pending
---

# Spec: {project_name}

## Executive Summary

Imported from a Spec Kit-style markdown artifact. This project is planned until clarification, probe, and validation gates confirm the generated contracts are execution-ready.

## Problem and Users

{md_list(user_stories)}

## Outcome and Success Metrics

Acceptance scenarios imported as success signals:

{md_list(acceptance)}

## User Stories

{md_list(user_stories)}

## Acceptance Scenarios

{md_list(acceptance)}

## Scope

### In Scope

{md_list(requirements)}

### Out of Scope

- Automatic execution before Delano validation and approval.
- Automatic external sync writes.

## Functional Requirements

{md_list(requirements)}

## Non-Functional Requirements

{md_list(non_functional)}

## Assumptions

{md_list(assumptions)}

## Needs Clarification

{md_list(clarifications)}

## Hypotheses and Unknowns

Assumptions imported from source:

{md_list(assumptions)}

## Touchpoints to Exercise

- Generated Delano project contracts.
- Task dependency and evidence validation.
- Import update note.

## Probe Findings

Pending. Run a delivery probe before activating this spec.

## Footguns Discovered

- Imported intent may contain assumptions that need operator confirmation.
- Imported tasks may not include enough evidence detail for closure.

## Remaining Unknowns

{md_list(clarifications)}

## Dependencies

- Source artifact: `{source_display}`

## Approval Notes

Imported by `delano import-spec-kit`. Review before activation.
"""
write_file(project_dir / "spec.md", spec)

plan = f"""---
name: {yaml_scalar(project_name)}
status: planned
lead: {yaml_scalar(lead)}
created: {now}
updated: {now}
linear_project_id:
risk_level: medium
spec_status_at_plan_time: planned
---

# Delivery Plan: {project_name}

## What Changed After Probe

No probe has been run yet. This plan was imported from a Spec Kit-style source and requires review.

## Architecture Decisions

Imported implementation plan:

{md_list(implementation_plan)}

## Probe-Driven Architecture Changes

Pending probe.

## Workstream Design

- WS-A Imported Delivery Foundation: first normalized workstream for imported tasks.

## Milestone Strategy

1. Review imported spec and clarify open questions.
2. Run required probe.
3. Execute ready tasks with Delano evidence gates.

## Rollout Strategy

Start with local validation and evidence collection. Do not sync externally until identity mappings are reviewed.

## Test Strategy

- Run `delano validate` after import.
- Add task-specific tests before closure.

## Rollback Strategy

If the import is wrong, remove `.project/projects/{slug}` before external sync or activation.

## Remaining Delivery Risks

- Source assumptions may be incomplete.
- Imported task boundaries may need workstream refinement.
- Clarifications may block activation.
"""
write_file(project_dir / "plan.md", plan)

write_file(project_dir / "decisions.md", "# Decisions\n\nTrack key project decisions with context and rationale.\n")

workstream = f"""---
name: WS-A Imported Delivery Foundation
owner: {yaml_scalar(owner)}
status: planned
created: {now}
updated: {now}
---

# Workstream: WS-A Imported Delivery Foundation

## Objective

Normalize and execute the imported Spec Kit-style task set under Delano governance.

## Owned Files/Areas

- `.project/projects/{slug}/`

## Dependencies

- Source artifact review.
- Delano validation.

## Risks

- Imported tasks may require clarification before execution.
- Parallel markers are hints and still need conflict review.

## Handoff Criteria

- Tasks have evidence logs.
- Validation passes before closure.
"""
write_file(project_dir / "workstreams" / "WS-A-imported-delivery-foundation.md", workstream)

def slugify(text):
    text = re.sub(r"^T\d+\s+", "", text.strip(), flags=re.IGNORECASE)
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return text or "imported-task"

if not raw_tasks:
    raw_tasks = ["- [ ] Review imported Spec Kit artifact and define executable Delano tasks."]

acceptance_ids = []
for index, item in enumerate(acceptance, start=1):
    match = re.search(r"\bAC[-_ ]?(\d{1,3})\b", item, re.IGNORECASE)
    acceptance_ids.append(f"AC-{int(match.group(1)):03d}" if match else f"AC-{index:03d}")

def parse_task(raw, index):
    text = raw.strip()
    parallel = bool(re.search(r"\[(?:P|p)\]", text))
    source_task_match = re.search(r"\bT[-_ ]?(\d{1,4})\b", text, re.IGNORECASE)
    story_match = re.search(r"\b(?:US|Story)[-_ ]?(\d{1,3})\b", text, re.IGNORECASE)
    story_id = f"US-{int(story_match.group(1)):03d}" if story_match else ""

    title = re.sub(r"^-\s*", "", text).strip()
    title = re.sub(r"^\[(?: |x|X|P|p)\]\s*", "", title).strip()
    title = re.sub(r"\[(?:P|p)\]", "", title).strip()
    title = re.sub(r"\[(?:US|Story)[-_ ]?\d{1,3}\]", "", title, flags=re.IGNORECASE).strip()
    title = re.sub(r"^T[-_ ]?\d{1,4}[:.)-]?\s*", "", title, flags=re.IGNORECASE).strip()
    title = re.sub(r"^\[[^\]]+\]\s*", "", title).strip()
    title = title or f"Review imported task {index}"

    vague = bool(re.search(r"\b(tbd|todo|clarify|needs clarification|unknown|investigate|research)\b", raw, re.IGNORECASE))
    generated_review_task = index == 1 and "Review imported Spec Kit artifact" in raw
    blocked = bool(clarifications) or vague or generated_review_task
    status = "blocked" if blocked else "ready"
    reason = "Open clarifications or vague source wording require review before execution." if blocked else "No source clarification blocker detected by importer."
    source_task_id = f"T{int(source_task_match.group(1)):03d}" if source_task_match else ""
    return title, parallel, status, reason, story_id, source_task_id

for index, raw in enumerate(raw_tasks, start=1):
    title, parallel, status, block_reason, story_id, source_task_id = parse_task(raw, index)
    task_id = f"T-{index:03d}"
    task_slug = slugify(title)
    acceptance_yaml = "[" + ", ".join(acceptance_ids) + "]" if acceptance_ids else "[]"
    blocker_frontmatter = ""
    blocker_section = ""
    if status == "blocked":
        blocker_frontmatter = f"blocked_owner: {yaml_scalar(owner)}\nblocked_check_back: {today}\n"
        blocker_section = f"\n## Blocker\n\n{block_reason}\n"
    task = f"""---
id: {task_id}
name: {yaml_scalar(title)}
status: {status}
workstream: WS-A
created: {now}
updated: {now}
linear_issue_id:
github_issue:
github_pr:
depends_on: []
conflicts_with: []
parallel: {str(parallel).lower()}
priority: medium
estimate: M
story_id: {story_id}
acceptance_criteria_ids: {acceptance_yaml}
{blocker_frontmatter}---

# Task: {title}

## Description

Imported from Spec Kit-style source task: `{raw}`

## Acceptance Criteria

- [ ] Task has been reviewed against the imported acceptance scenarios.
- [ ] Implementation satisfies relevant Delano evidence requirements.

## Traceability

- Source task id: {source_task_id or "none detected"}
- Story: {story_id or "none detected"}
- Acceptance criteria: {", ".join(acceptance_ids) if acceptance_ids else "none detected"}
{blocker_section}
## Technical Notes

- Source artifact: `{source_display}`
- Parallel marker imported: `{str(parallel).lower()}`
- Initial status: `{status}`

## Definition of Done

- [ ] Implementation complete
- [ ] Tests pass
- [ ] Review complete
- [ ] Docs updated if behavior is user-visible
- [ ] Evidence recorded

## Evidence Log

- {now}: Imported from Spec Kit-style markdown by `delano import-spec-kit`.
"""
    write_file(project_dir / "tasks" / f"{task_id}-{task_slug}.md", task)

update = f"""# Imported from Spec Kit-style artifact

Imported `{source_display}` into Delano project `{slug}`.

## Source classification

- Shape: single-file Spec Kit-style markdown fixture.
- Confidence: initial supported fixture shape.

## Imported counts

- User stories: {len(user_stories)}
- Acceptance scenarios: {len(acceptance)}
- Functional requirements: {len(requirements)}
- Non-functional requirements: {len(non_functional)}
- Clarifications: {len(clarifications)}
- Tasks: {len(raw_tasks)}

## Unresolved clarifications

{md_list(clarifications)}

## Next step

Review the generated project, then run Delano validation and a probe before activation.
"""
write_file(project_dir / "updates" / f"{today}-imported-from-spec-kit.md", update)
PY

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
  source_display="$source_md"
  case "$source_display" in
    "$root"/*) source_display="${source_display#"$root/"}" ;;
  esac
  source_json="$(printf '%s' "$source_display" | json_escape)"
  validation_json="$(printf '%s' "$validation_status" | json_escape)"
  if [[ "$ok" == "true" ]]; then
    printf '{"ok":true,"command":"import-spec-kit","project":%s,"source":%s,"validation":%s}\n' "$project_json" "$source_json" "$validation_json"
  else
    error_json="$(printf '%s' "$error" | json_escape)"
    printf '{"ok":false,"command":"import-spec-kit","project":%s,"source":%s,"validation":%s,"error":%s}\n' "$project_json" "$source_json" "$validation_json" "$error_json"
    exit 1
  fi
else
  echo "Created Delano project from Spec Kit-style artifact: $project_dir"
  echo "Validation: $validation_status"
  echo "Next: review $project_dir/spec.md, then run a probe before activation."
fi
