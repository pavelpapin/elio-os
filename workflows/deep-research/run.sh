#!/bin/bash
# Deep Research Workflow — BullMQ submission
# Usage:
#   ./run.sh "topic"                              # Start new research
#   ./run.sh --resume <run_id>                    # Resume from crash
#   ./run.sh --resume <run_id> --input file.json  # Resume with user input

set -uo pipefail
cd /root/.claude

# Load environment
[ -f "secrets/.env" ] && export $(grep -v '^#' secrets/.env | xargs 2>/dev/null) || true

# Lock file
LOCK="/tmp/elio-deep-research.lock"
[ -f "$LOCK" ] && exit 1
echo $$ > "$LOCK"
trap "rm -f $LOCK" EXIT

# Submit to BullMQ via elio CLI
exec npx tsx elio/src/cli.ts workflow deep-research "$@"
