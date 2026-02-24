#!/bin/bash
# Clear Pointa demo fixtures and restore original data from backup

set -euo pipefail

POINTA_DIR="$HOME/.pointa"
BACKUP_DIR="$POINTA_DIR/.backup-before-demo"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "No backup found. Demo may not have been loaded, or was already cleared."
  exit 0
fi

# Restore backed-up files
restored=false
for file in annotations.json issue_reports.json archive.json; do
  if [ -f "$BACKUP_DIR/$file" ]; then
    cp "$BACKUP_DIR/$file" "$POINTA_DIR/$file"
    restored=true
  fi
done

# If user had no prior data, write empty arrays
if [ "$restored" = false ]; then
  echo "[]" > "$POINTA_DIR/annotations.json"
  echo "[]" > "$POINTA_DIR/issue_reports.json"
fi

rm -rf "$BACKUP_DIR"

echo "Demo fixtures cleared. Original data restored."
