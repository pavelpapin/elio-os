#!/bin/bash
# Deep Research Workflow
set -uo pipefail
cd /root/.claude

# Environment
[ -f "secrets/.env" ] && export $(grep -v '^#' secrets/.env | xargs 2>/dev/null) || true

# Lock
LOCK="/tmp/elio-deep-research.lock"
[ -f "$LOCK" ] && exit 1
echo $$ > "$LOCK"
trap "rm -f $LOCK" EXIT

# Execute
exec npx tsx elio/src/cli.ts workflow deep-research "$@"
