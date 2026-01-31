#!/bin/bash
# {Workflow Name} — Shell wrapper template
# Replace {workflow-name} with actual workflow ID from registry.yaml
# All logic should be in packages/{workflow-name}/src/
set -uo pipefail
cd /root/.claude

# Environment
[ -f "secrets/.env" ] && export $(grep -v '^#' secrets/.env | xargs 2>/dev/null) || true

# Lock (prevent concurrent runs)
LOCK="/tmp/elio-{workflow-name}.lock"
[ -f "$LOCK" ] && exit 1
echo $$ > "$LOCK"
trap "rm -f $LOCK" EXIT

# Execute (replay guards should be in TypeScript, not bash)
exec npx tsx elio/src/cli.ts workflow {workflow-name} "$@"
