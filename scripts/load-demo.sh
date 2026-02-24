#!/bin/bash
# Load Pointa demo fixtures into ~/.pointa/
# Backs up existing data so it can be restored with clear-demo.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
POINTA_DIR="$HOME/.pointa"
BACKUP_DIR="$POINTA_DIR/.backup-before-demo"
FIXTURES_DIR="$REPO_ROOT/testing/fixtures/demo"

# Check fixtures exist
if [ ! -d "$FIXTURES_DIR" ]; then
  echo "Error: Fixtures directory not found at $FIXTURES_DIR"
  exit 1
fi

# Create .pointa dir if needed
mkdir -p "$POINTA_DIR"

# Handle existing backup
if [ -d "$BACKUP_DIR" ]; then
  if [ "${1:-}" = "--force" ]; then
    rm -rf "$BACKUP_DIR"
  else
    echo "A previous backup already exists at $BACKUP_DIR"
    echo "Run with --force to overwrite, or run ./scripts/clear-demo.sh first."
    exit 1
  fi
fi

# Back up existing files
mkdir -p "$BACKUP_DIR"
for file in annotations.json issue_reports.json archive.json; do
  if [ -f "$POINTA_DIR/$file" ]; then
    cp "$POINTA_DIR/$file" "$BACKUP_DIR/$file"
  fi
done

# Copy fixtures
cp "$FIXTURES_DIR/annotations.json" "$POINTA_DIR/annotations.json"
cp "$FIXTURES_DIR/issue_reports.json" "$POINTA_DIR/issue_reports.json"

echo ""
echo "Demo fixtures loaded!"
echo ""
echo "Next steps:"
echo "  1. Start the Pointa server:  cd annotations-server && npm run dev"
echo "  2. Serve the demo page:      python3 -m http.server 8080  (from repo root)"
echo "  3. Open in Chrome:           http://localhost:8080/testing/demo-app/index.html"
echo "  4. Enable the Pointa extension — you should see 6 annotations"
echo ""
echo "To restore your original data:  ./scripts/clear-demo.sh"
