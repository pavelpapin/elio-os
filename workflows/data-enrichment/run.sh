#!/bin/bash
# Data Enrichment Workflow — BullMQ submission
# Usage:
#   ./run.sh "input.csv"                             # Start new enrichment
#   ./run.sh --resume <run_id>                       # Resume from crash
#   ./run.sh --resume <run_id> --input answers.json  # Resume with user input

set -uo pipefail
cd /root/.claude

# Load environment
[ -f "secrets/.env" ] && export $(grep -v '^#' secrets/.env | xargs 2>/dev/null) || true

# Lock file
LOCK="/tmp/elio-data-enrichment.lock"
[ -f "$LOCK" ] && exit 1
echo $$ > "$LOCK"
trap "rm -f $LOCK" EXIT

# Submit to BullMQ via elio CLI
exec npx tsx elio/src/cli.ts workflow data-enrichment "$@"
