#!/bin/bash
# lint-registry.sh — Validates that all disk entities have registry.yaml entries
# Run: bash scripts/lint-registry.sh
set -euo pipefail

ROOT="/root/.claude"
REGISTRY="$ROOT/registry.yaml"
ERRORS=0

echo "=== Registry Lint ==="

# Check skills
for skill in "$ROOT"/skills/*/SKILL.md; do
  name=$(basename "$(dirname "$skill")")
  [[ "$name" == "_template" ]] && continue
  if ! grep -q "^  ${name}:" "$REGISTRY"; then
    echo "FAIL: skill '$name' exists on disk but not in registry"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check workflows
for wf in "$ROOT"/workflows/*/WORKFLOW.md; do
  name=$(basename "$(dirname "$wf")")
  [[ "$name" == "_template" ]] && continue
  if ! grep -q "^  ${name}:" "$REGISTRY"; then
    echo "FAIL: workflow '$name' exists on disk but not in registry"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check adapters
for adapter in "$ROOT"/mcp-server/src/adapters/*/; do
  name=$(basename "$adapter")
  [[ "$name" == "__tests__" ]] && continue
  if ! grep -q "$name" "$REGISTRY"; then
    echo "FAIL: adapter '$name' exists on disk but not in registry"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check packages
for pkg in "$ROOT"/packages/*/; do
  name=$(basename "$pkg")
  if ! grep -q "$name" "$REGISTRY"; then
    echo "FAIL: package '$name' exists on disk but not in registry"
    ERRORS=$((ERRORS + 1))
  fi
done

echo "---"
if [ $ERRORS -eq 0 ]; then
  echo "OK: registry is consistent with disk ($ERRORS errors)"
  exit 0
else
  echo "FAIL: $ERRORS inconsistencies found"
  exit 1
fi
