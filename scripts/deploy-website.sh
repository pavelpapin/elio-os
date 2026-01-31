#!/bin/bash
set -e

echo "=== Deploying website ==="

cd /root/.claude/website
pnpm exec next build

echo "=== Build complete. Static files in website/out/ ==="
echo "=== nginx serves them automatically ==="

# Reload nginx to pick up any config changes
sudo nginx -s reload 2>/dev/null || true

echo "=== Deploy done ==="
