#!/bin/bash
set -e

# Quick MCP Server Update
# Usage: ./scripts/update-mcp.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 Quick MCP Server Update${NC}\n"

# Build MCP server
echo -e "${YELLOW}[1/3] Building MCP server...${NC}"
cd "$PROJECT_ROOT"
pnpm --filter @elio/mcp-server build || {
  echo -e "\033[0;31m✗ Build failed${NC}"
  exit 1
}
echo -e "${GREEN}✓ Build complete${NC}"

# Restart service
echo -e "\n${YELLOW}[2/3] Restarting service...${NC}"
systemctl restart elio-mcp
sleep 2

# Verify
echo -e "\n${YELLOW}[3/3] Verifying...${NC}"
if systemctl is-active --quiet elio-mcp; then
  echo -e "${GREEN}✓ MCP server running${NC}\n"
  systemctl status elio-mcp --no-pager | head -5
else
  echo -e "\033[0;31m✗ Service failed${NC}"
  journalctl -u elio-mcp -n 20 --no-pager
  exit 1
fi
