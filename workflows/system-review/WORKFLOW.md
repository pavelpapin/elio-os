# System Review v2 — Hybrid Pipeline

Nightly technical health check using deterministic data collection + LLM analysis.

**Schedule:** `0 3 * * *` (03:00 UTC)
**Script:** `/root/.claude/workflows/system-review/run.sh`

## Architecture

```
run.sh → elio CLI → BullMQ → Worker → execute.ts
│
├─ Phase 1: COLLECT (deterministic, 2min timeout)
│  Collectors run in parallel → ReviewData JSON
│
├─ Phase 2: ANALYZE (LLM, 1min timeout)
│  ReviewData → FixPlan JSON (fallback: conservative plan)
│
├─ Phase 3: FIX (deterministic + agentic, 5min timeout)
│  Apply eslint, security, TS error fixes
│
├─ Phase 4: SPLIT FILES (agentic, 3h timeout)
│  Split oversized files (>200 lines) via Claude API
│  Concurrency: 2 files in parallel, 10min per file
│
├─ Phase 5: VERIFY (deterministic, 3min timeout)
│  build+test → self-heal if broken → rollback if unrecoverable
│
└─ Phase 6: REPORT + DELIVER
   Notion page + Telegram summary
```

## Key Principles

### Deterministic data collection
Scripts always produce the same structured output for the same input. No LLM involved in data collection. Every collector returns Zod-validated JSON.

### LLM only analyzes
Claude receives structured JSON and returns structured JSON. If Claude fails, the system falls back to a conservative plan (only safe auto-fixes).

### Safe auto-fixes only
- `eslint --fix` — idempotent
- `pnpm audit fix` — non-breaking only
- Log rotation, cache cleanup — safe
- `git gc --auto` — safe
- File splitting via Claude API — barrel re-export preserves imports

### Verification is mandatory
After fixes: `pnpm build` + `pnpm test`. If either fails → rollback ALL changes. Report still generated showing what happened.

## Checks

| Check | Tool | What it finds |
|-------|------|---------------|
| Git | `git log/diff/status` | Recent changes, uncommitted work |
| TypeScript | `tsc --noEmit` | Type errors (real compiler) |
| ESLint | `eslint --format json` | Lint issues + fixable count |
| Architecture | `wc -l` + function parser | Files >200 lines, functions >50 lines |
| Security | `pnpm audit --json` + regex | CVEs + hardcoded secrets |
| Infrastructure | `df`, `free`, `systemctl` | Disk, RAM, swap, failed services |
| Maintenance | `find`, `du`, `git count-objects` | Old logs, cache sizes |

## Report Format

Notion page contains:
1. **Health Score** with emoji indicator
2. **Data Collection** table with raw numbers
3. **Fixes Applied** with command output for each
4. **Verification** results (build/test pass/fail)
5. **Backlog Items** with priority
6. **Summary** totals

## Files

```
packages/system-review/src/
├── types.ts           # Zod schemas
├── exec.ts            # Shell execution helper
├── execute.ts         # BullMQ entry point (ProgressAdapter)
├── analyze.ts         # LLM prompt + fix plan parsing
├── scoring.ts         # Health score calculation
├── report.ts          # Markdown report generation
├── verify.ts          # Build/test/rollback
├── collectors/        # Deterministic data collection
│   ├── index.ts       # Runs all collectors in parallel
│   ├── git.ts
│   ├── typescript.ts
│   ├── eslint.ts
│   ├── architecture.ts
│   ├── security.ts
│   ├── infra.ts
│   └── maintenance.ts
├── stages/            # Stage executors
│   ├── collect.ts
│   ├── analyze.ts
│   ├── fix.ts
│   ├── split-files.ts # Split oversized files (>200 lines)
│   ├── verify.ts
│   ├── report.ts
│   └── deliver.ts
└── fixers/            # Fix application
    ├── index.ts       # Applies fix plan (skips file-split)
    ├── file-split.ts  # Claude API file splitting
    ├── agentic.ts     # Claude API TS error fixing
    ├── eslint.ts
    ├── security.ts
    └── maintenance.ts
```

## Manual Execution

```bash
bash /root/.claude/workflows/system-review/run.sh
```
