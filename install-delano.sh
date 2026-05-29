#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${DELANO_REPO_URL:-https://github.com/MajesteitBart/delano.git}"
TARGET_DIR="$(pwd)"
BRANCH=""
FORCE=false
ASSUME_YES=false
AGENTS_RAW=""

usage() {
  cat <<USAGE
Delano legacy installer bridge (interactive by default)

Usage:
  $0 [options]

Options:
  --repo <url>       Delano git repository URL
  --target <dir>     Target directory (default: current directory)
  --branch <name>    Branch/tag to install (default: remote default branch)
  --agents <list>    Comma-separated agents: claude,codex,opencode,pi
  --force            Overwrite existing files without prompting
  --yes              Assume yes for prompts
  -h, --help         Show this help

Notes:
  - This script remains the shell-first migration bridge while @bvdm/delano matures.
  - Prefer 'delano install' from @bvdm/delano for the allowlist-driven, conflict-first v1 install path when that package flow is available.
USAGE
}

log() { printf '%s\n' "$*"; }
warn() { printf '⚠️  %s\n' "$*" >&2; }
err() { printf '❌ %s\n' "$*" >&2; }

confirm() {
  local prompt="$1"
  if [[ "$ASSUME_YES" == "true" ]]; then
    return 0
  fi
  read -r -p "$prompt [y/N]: " reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

parse_agents() {
  local raw="$1"
  local -n out_ref=$2
  out_ref=()

  IFS=',' read -r -a parts <<< "$raw"
  for p in "${parts[@]}"; do
    local a
    a="$(echo "$p" | tr '[:upper:]' '[:lower:]' | xargs)"
    case "$a" in
      claude|codex|opencode|pi)
        out_ref+=("$a")
        ;;
      "") ;;
      *)
        err "Unknown agent: $a"
        exit 1
        ;;
    esac
  done

  # unique preserve order
  local -A seen=()
  local unique=()
  for a in "${out_ref[@]}"; do
    if [[ -z "${seen[$a]:-}" ]]; then
      seen[$a]=1
      unique+=("$a")
    fi
  done
  out_ref=("${unique[@]}")
}

select_agents_interactive() {
  cat <<MENU
Which coding agents do you use? (multi-select)

  1) Claude Code
  2) Codex CLI
  3) OpenCode
  4) Pi coding agent

Enter one or more numbers, comma-separated (example: 1,2)
MENU

  read -r -p "Selection: " pick
  pick="$(echo "$pick" | tr -d ' ')"
  if [[ -z "$pick" ]]; then
    err "No agents selected"
    exit 1
  fi

  local mapped=()
  IFS=',' read -r -a nums <<< "$pick"
  for n in "${nums[@]}"; do
    case "$n" in
      1) mapped+=("claude") ;;
      2) mapped+=("codex") ;;
      3) mapped+=("opencode") ;;
      4) mapped+=("pi") ;;
      *) err "Invalid selection: $n"; exit 1 ;;
    esac
  done

  # unique preserve order
  local -A seen=()
  AGENTS=()
  for a in "${mapped[@]}"; do
    if [[ -z "${seen[$a]:-}" ]]; then
      seen[$a]=1
      AGENTS+=("$a")
    fi
  done
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO_URL="$2"; shift 2 ;;
    --target)
      TARGET_DIR="$2"; shift 2 ;;
    --branch)
      BRANCH="$2"; shift 2 ;;
    --agents)
      AGENTS_RAW="$2"; shift 2 ;;
    --force)
      FORCE=true; shift ;;
    --yes)
      ASSUME_YES=true; shift ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      err "Unknown argument: $1"
      usage
      exit 1 ;;
  esac
done

if ! command -v git >/dev/null 2>&1; then
  err "git is required"
  exit 1
fi

mkdir -p "$TARGET_DIR"
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

AGENTS=()
if [[ -n "$AGENTS_RAW" ]]; then
  parse_agents "$AGENTS_RAW" AGENTS
else
  select_agents_interactive
fi

if [[ ${#AGENTS[@]} -eq 0 ]]; then
  err "No agents selected"
  exit 1
fi

CORE_PATHS=(
  "HANDBOOK.md"
  "AGENTS.md"
  ".project"
  ".delano"
  ".agents/README.md"
  ".agents/common"
  ".agents/scripts"
  ".agents/rules"
  ".agents/hooks"
  ".agents/skills"
  ".agents/logs"
)

declare -A ADAPTER_PATHS
ADAPTER_PATHS[claude]=".agents/adapters/claude CLAUDE.md"
ADAPTER_PATHS[codex]=".agents/adapters/codex CODEX.md"
ADAPTER_PATHS[opencode]=".agents/adapters/opencode OPENCODE.md"
ADAPTER_PATHS[pi]=".agents/adapters/pi PI.md"

paths=("${CORE_PATHS[@]}")
for a in "${AGENTS[@]}"; do
  # shellcheck disable=SC2206
  extra=( ${ADAPTER_PATHS[$a]} )
  paths+=("${extra[@]}")
done

# unique paths preserve order
unique_paths=()
declare -A path_seen=()
for p in "${paths[@]}"; do
  if [[ -z "${path_seen[$p]:-}" ]]; then
    path_seen[$p]=1
    unique_paths+=("$p")
  fi
done

if [[ -z "$BRANCH" ]]; then
  BRANCH="$(git ls-remote --symref "$REPO_URL" HEAD 2>/dev/null | awk '/^ref:/ {sub("refs/heads/","",$2); print $2; exit}')"
  BRANCH="${BRANCH:-main}"
fi

log "Installing Delano from: $REPO_URL"
log "Branch: $BRANCH"
log "Target: $TARGET_DIR"
log "Agents: ${AGENTS[*]}"
log "Mode: legacy bridge installer"
log ""

tmp="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp"
}
trap cleanup EXIT

git -C "$tmp" init -q
git -C "$tmp" remote add origin "$REPO_URL"
git -C "$tmp" config advice.detachedHead false

if git -C "$tmp" sparse-checkout init --cone >/dev/null 2>&1; then
  git -C "$tmp" sparse-checkout set "${unique_paths[@]}" >/dev/null 2>&1 || true
else
  mkdir -p "$tmp/.git/info"
  : > "$tmp/.git/info/sparse-checkout"
  for p in "${unique_paths[@]}"; do
    printf '%s\n' "$p" >> "$tmp/.git/info/sparse-checkout"
    printf '%s/**\n' "$p" >> "$tmp/.git/info/sparse-checkout"
  done
  git -C "$tmp" config core.sparseCheckout true
fi

if ! git -C "$tmp" fetch --depth 1 origin "$BRANCH" >/dev/null 2>&1; then
  err "Could not fetch branch '$BRANCH' from $REPO_URL"
  exit 1
fi
git -C "$tmp" checkout -q FETCH_HEAD

copy_item() {
  local rel="$1"
  local src="$tmp/$rel"
  local dst="$TARGET_DIR/$rel"

  if [[ ! -e "$src" && ! -L "$src" ]]; then
    warn "Path not found in source repo, skipping: $rel"
    return 0
  fi

  if [[ -e "$dst" || -L "$dst" ]]; then
    if [[ "$FORCE" == "true" ]]; then
      rm -rf "$dst"
    else
      if confirm "Overwrite existing '$rel'?"; then
        rm -rf "$dst"
      else
        warn "Skipped existing: $rel"
        return 0
      fi
    fi
  fi

  mkdir -p "$(dirname "$dst")"
  if [[ -d "$src" && ! -L "$src" ]]; then
    cp -a "$src" "$(dirname "$dst")/"
  else
    cp -a "$src" "$dst"
  fi

  log "✓ Installed: $rel"
}

for rel in "${unique_paths[@]}"; do
  copy_item "$rel"
done

# Compatibility symlink for runtime scripts
if [[ -e "$TARGET_DIR/.agents" ]]; then
  if [[ -L "$TARGET_DIR/.claude" ]]; then
    current_target="$(readlink "$TARGET_DIR/.claude" || true)"
    if [[ "$current_target" != ".agents" ]]; then
      if [[ "$FORCE" == "true" ]] || confirm "Replace existing .claude symlink target '$current_target'?"; then
        rm -f "$TARGET_DIR/.claude"
      fi
    fi
  elif [[ -e "$TARGET_DIR/.claude" ]]; then
    if [[ "$FORCE" == "true" ]] || confirm "Replace existing .claude directory/file with symlink?"; then
      rm -rf "$TARGET_DIR/.claude"
    fi
  fi

  if [[ ! -e "$TARGET_DIR/.claude" && ! -L "$TARGET_DIR/.claude" ]]; then
    if (cd "$TARGET_DIR" && ln -s .agents .claude) 2>/dev/null; then
      log "✓ Created compatibility symlink: .claude -> .agents"
    else
      warn "Could not create symlink (.claude). Falling back to directory copy."
      cp -a "$TARGET_DIR/.agents" "$TARGET_DIR/.claude"
    fi
  fi
else
  warn "Runtime missing at .agents, skipped .claude compatibility link"
fi

log ""
log "Done."
log "Next steps:"
log "1) Read HANDBOOK.md"
log "2) Read AGENTS.md"
log "3) Validate scaffold: bash .agents/scripts/pm/validate.sh"
log "4) Prefer @bvdm/delano for the conservative v1 install path when you adopt the npm CLI flow."
