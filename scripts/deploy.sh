#!/bin/bash
set -e

# Elio OS Deployment Script
# Usage: ./scripts/deploy.sh [options]
# Options:
#   --skip-build    Skip build step
#   --skip-push     Skip git push
#   --skip-restart  Skip service restart
#   -m "message"    Commit message (if uncommitted changes)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_BUILD=false
SKIP_PUSH=false
SKIP_RESTART=false
COMMIT_MSG=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build) SKIP_BUILD=true; shift ;;
    --skip-push) SKIP_PUSH=true; shift ;;
    --skip-restart) SKIP_RESTART=true; shift ;;
    -m) COMMIT_MSG="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    Elio OS Deployment Pipeline        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check git status
echo -e "${YELLOW}[1/6] Checking git status...${NC}"
if [[ -n $(git status --porcelain) ]]; then
  echo -e "${YELLOW}Uncommitted changes detected:${NC}"
  git status --short

  if [[ -z "$COMMIT_MSG" ]]; then
    echo -e "${RED}Error: Uncommitted changes found. Use -m 'message' or commit manually${NC}"
    exit 1
  fi

  echo -e "${GREEN}Committing changes: $COMMIT_MSG${NC}"
  git add .
  git commit -m "$COMMIT_MSG"
else
  echo -e "${GREEN}✓ Working directory clean${NC}"
fi

# Step 2: Type check
echo -e "\n${YELLOW}[2/6] Running type check...${NC}"
pnpm typecheck || {
  echo -e "${RED}✗ Type check failed${NC}"
  exit 1
}
echo -e "${GREEN}✓ Type check passed${NC}"

# Step 3: Build
if [ "$SKIP_BUILD" = false ]; then
  echo -e "\n${YELLOW}[3/6] Building packages...${NC}"
  pnpm build || {
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
  }
  echo -e "${GREEN}✓ Build successful${NC}"
else
  echo -e "\n${YELLOW}[3/6] Skipping build${NC}"
fi

# Step 4: Registry validation
echo -e "\n${YELLOW}[4/6] Validating registry...${NC}"
npx tsx scripts/validate-registry.ts || {
  echo -e "${RED}✗ Registry validation failed${NC}"
  exit 1
}
echo -e "${GREEN}✓ Registry valid${NC}"

# Step 5: Restart MCP service
if [ "$SKIP_RESTART" = false ]; then
  echo -e "\n${YELLOW}[5/6] Restarting MCP service...${NC}"
  if systemctl is-active --quiet elio-mcp; then
    echo "Stopping elio-mcp..."
    systemctl stop elio-mcp
  fi

  echo "Starting elio-mcp..."
  systemctl start elio-mcp

  # Wait for service to stabilize
  sleep 2

  if systemctl is-active --quiet elio-mcp; then
    echo -e "${GREEN}✓ MCP service running${NC}"
    systemctl status elio-mcp --no-pager | head -5
  else
    echo -e "${RED}✗ MCP service failed to start${NC}"
    systemctl status elio-mcp --no-pager
    exit 1
  fi
else
  echo -e "\n${YELLOW}[5/6] Skipping service restart${NC}"
fi

# Step 6: Push to GitHub
if [ "$SKIP_PUSH" = false ]; then
  echo -e "\n${YELLOW}[6/6] Pushing to GitHub...${NC}"

  BRANCH=$(git branch --show-current)
  AHEAD=$(git rev-list --count origin/$BRANCH..$BRANCH 2>/dev/null || echo "0")

  if [ "$AHEAD" -gt 0 ]; then
    echo -e "${YELLOW}Pushing $AHEAD commits to origin/$BRANCH...${NC}"
    git push origin "$BRANCH" || {
      echo -e "${RED}✗ Git push failed${NC}"
      exit 1
    }
    echo -e "${GREEN}✓ Pushed to GitHub${NC}"
  else
    echo -e "${GREEN}✓ Already up to date with origin${NC}"
  fi
else
  echo -e "\n${YELLOW}[6/6] Skipping git push${NC}"
fi

# Success
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✓ Deployment Successful           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"

# Show summary
echo -e "\n${BLUE}Summary:${NC}"
echo -e "  Branch: ${GREEN}$(git branch --show-current)${NC}"
echo -e "  Commit: ${GREEN}$(git rev-parse --short HEAD)${NC}"
echo -e "  MCP Status: ${GREEN}$(systemctl is-active elio-mcp)${NC}"
