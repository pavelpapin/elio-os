#!/bin/bash
# Quick ship - commit, build, restart, push
# Usage: ./scripts/ship.sh "commit message"

set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/ship.sh 'commit message'"
  exit 1
fi

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Shipping changes...${NC}\n"

# Run full deployment
cd /root/.claude
./scripts/deploy.sh -m "$1"

echo -e "\n${GREEN}✨ Changes shipped!${NC}"
