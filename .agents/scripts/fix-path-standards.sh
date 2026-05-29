#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <file...>"
  echo "Replaces absolute user paths with <ABS_PATH> in the provided files."
  exit 1
fi

for file in "$@"; do
  [[ -f "$file" ]] || { echo "Skip missing file: $file"; continue; }
  perl -0777 -i -pe 's#/home/[^\s)]+#<ABS_PATH>#g; s#/Users/[^\s)]+#<ABS_PATH>#g; s#/mnt/[A-Za-z]/[^\s)]+#<ABS_PATH>#g; s#[A-Za-z]:\\[^\s)]+#<ABS_PATH>#g' "$file"
  echo "Normalized paths in: $file"
done
