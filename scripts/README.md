# Scripts Directory

Utility scripts for Elio OS operations. These are NOT workflows — they don't follow
WORKFLOW_STANDARD.md and don't have WORKFLOW.md documentation.

## Categories

### Workflow Runners
Scripts that invoke implemented workflows:
- `run-system-review.sh` — runs system-review workflow

### Scheduled Tasks
Scripts triggered by cron or scheduler:
- `nightly-cto.sh` — nightly CTO review
- `nightly-consilium.sh` — nightly consilium

### Infrastructure
- `health-check.ts` — system health check
- `infra-health.sh` — infrastructure health
- `memory-guardian.sh` — memory monitoring
- `memory-watchdog.sh` — memory limits
- `disk-cleanup.sh` — disk space management
- `smoke-test.sh` — quick smoke test

### Data & Sync
- `sync-backlog-to-notion.ts` — sync backlog to Notion
- `save-report-to-notion.ts` — save reports to Notion

### Auth & Setup
- `google-auth.ts` — Google OAuth setup
- `linkedin-*.js` — LinkedIn authentication

### Validation
- `validate-registry.ts` — check registry.yaml vs filesystem

## Promotion Policy

Scripts that meet these criteria should be promoted to workflows:
1. Has multiple stages (>2 distinct phases)
2. Needs state tracking between stages
3. Should send Telegram notifications
4. Runs regularly on schedule
5. Produces a deliverable (report, page, etc.)

To promote: follow `WORKFLOW_STANDARD.md` checklist.
