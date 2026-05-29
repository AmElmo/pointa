#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$root"

python_cmd=()

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

  echo "No usable Python runtime found (tried: python3, py -3, python)." >&2
  exit 1
}

show_all=false
if [[ "${1:-}" == "--all" ]]; then
  show_all=true
fi

if [[ "$show_all" == "true" ]]; then
  export DELANO_NEXT_ALL=1
else
  export DELANO_NEXT_ALL=0
fi

resolve_python_cmd

"${python_cmd[@]}" - <<'PY'
import re
from pathlib import Path

ROOT = Path('.')
TASK_STATUS_READY = 'ready'

rank = {'urgent': 0, 'high': 1, 'medium': 2, 'low': 3}

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

def parse_list(raw: str):
    raw = (raw or '[]').strip()
    if raw.startswith('[') and raw.endswith(']'):
      inner = raw[1:-1].strip()
      if not inner:
        return []
      return [x.strip().strip('"\'') for x in inner.split(',') if x.strip()]
    return []

projects = sorted((ROOT / '.project' / 'projects').glob('*'))
all_candidates = []
for p in projects:
  if not p.is_dir() or p.name == '.gitkeep':
    continue
  tasks = {}
  for tf in sorted((p / 'tasks').glob('*.md')):
    meta = parse_frontmatter(tf)
    tid = meta.get('id', tf.stem)
    tasks[tid] = {
      'path': tf,
      'name': meta.get('name', tf.stem),
      'status': meta.get('status', ''),
      'depends_on': parse_list(meta.get('depends_on', '[]')),
      'priority': meta.get('priority', 'medium').lower(),
    }

  for tid, t in tasks.items():
    if t['status'] != TASK_STATUS_READY:
      continue
    unmet = [d for d in t['depends_on'] if d in tasks and tasks[d]['status'] != 'done']
    if unmet:
      continue
    all_candidates.append((rank.get(t['priority'], 4), p.name, tid, t['name'], t['priority'], str(t['path'])))

all_candidates.sort()
if not all_candidates:
  print('No dependency-safe ready tasks found.')
  raise SystemExit(0)

import os
show_all = os.environ.get('DELANO_NEXT_ALL', '0') == '1'
if not show_all:
  all_candidates = all_candidates[:1]

for _, project, tid, name, prio, path in all_candidates:
  print(f'{project}\t{tid}\t{prio}\t{name}\t{path}')
PY
