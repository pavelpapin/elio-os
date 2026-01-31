#!/bin/bash
# System Review — Shell Wrapper
# All logic lives in: packages/system-review/src/execute.ts
# This file: env + lock + single call. Nothing else.
# See: core/WORKFLOW_STANDARD.md

set -uo pipefail
cd /root/.claude

# Load environment
[ -f "secrets/.env" ] && export $(grep -v '^#' secrets/.env | xargs 2>/dev/null) || true

# Lock (prevent concurrent runs)
LOCK_FILE="/tmp/elio-review.lock"
if [ -f "$LOCK_FILE" ]; then
  LOCK_AGE=$(( $(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0) ))
  if [ "$LOCK_AGE" -lt 18000 ]; then
    echo "Another review is running (lock age: ${LOCK_AGE}s)" >&2
    exit 1
  fi
  rm -f "$LOCK_FILE"
fi

echo $$ > "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

# Submit to BullMQ via elio CLI
npx tsx elio/src/cli.ts workflow system-review "$@"
