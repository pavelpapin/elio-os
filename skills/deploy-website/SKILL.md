# Deploy Website

## Purpose
Build and deploy the website (Next.js static export served by nginx).

## Steps
1. Run `/root/.claude/scripts/deploy-website.sh`
2. Verify: `curl -s -o /dev/null -w "%{http_code}" http://localhost`

## Quick Use
```bash
bash /root/.claude/scripts/deploy-website.sh
```
