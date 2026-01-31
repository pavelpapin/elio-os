# Plan: Auto-split oversized files in System Review

## Problem
Oversized files (>200 lines) are detected by the collector but go to `backlog` in analyze.ts (line 151-160). They never get fixed automatically. The user wants them split before the report is generated.

## Key Challenge
File splitting is expensive — each file requires Claude to analyze structure, split into modules, and update imports. Total time can be several hours for many files.

## Changes

### 1. New fixer: `packages/system-review/src/fixers/file-split.ts`

Splits a single oversized file via Claude API:
- Sends file content + prompt asking to split into <=200-line modules
- Claude returns JSON: `{ files: [{ path, content }], importsToUpdate: [{ file, oldImport, newImport }] }`
- Writes new files, updates imports in affected files
- Per-file timeout: **10 minutes** (`AbortSignal.timeout(600_000)`)
- Concurrency: process **2 files in parallel** using a simple pool
- Uses `Promise.allSettled` so one failure doesn't kill others

### 2. New stage: `split-files` between `fix` and `verify`

In `execute.ts`, add stage between fix and verify:
- **Timeout: 3 hours** (`10_800_000ms`) — enough for ~30 files at 10min each with concurrency 2
- Gate: always passes (partial success is OK)
- Reads `collect` data to get `oversizedFiles` list
- Calls file-split fixer for each file
- Logs progress per-file via ProgressAdapter

### 3. Update `analyze.ts` — oversized files become `auto-fix`

Change `buildConservativePlan` (line 151-160) and the LLM prompt (line 32) to mark oversized files as `auto-fix` with `category: 'architecture'` and `id` containing `'file-split'`.

### 4. Update `fixers/index.ts` — route `file-split` actions

Add handler: `if (action.id.includes('file-split'))` → call new `splitOversizedFiles()`.

### 5. Timeout adjustments

| What | Current | New |
|------|---------|-----|
| Fix stage timeout | 300_000 (5min) | 300_000 (unchanged, split is separate stage) |
| New split-files stage | — | 10_800_000 (3h) |
| Lock file timeout (run.sh) | 7200s (2h) | 18000s (5h) |
| Registry timeout | 30m | 6h |
| Per-file split timeout | — | 600_000 (10min) |

### 6. Self-heal integration

If verify fails after split-files, self-heal treats each split as a granular action — can rollback individual file splits.

## Files to modify

| File | Change |
|------|--------|
| `packages/system-review/src/fixers/file-split.ts` | **NEW** — core splitting logic |
| `packages/system-review/src/stages/split-files.ts` | **NEW** — stage wrapper |
| `packages/system-review/src/execute.ts` | Add split-files stage between fix and verify |
| `packages/system-review/src/analyze.ts` | Change oversized from backlog → auto-fix |
| `packages/system-review/src/fixers/index.ts` | Add file-split handler |
| `packages/system-review/src/fixers/granular.ts` | Add granular actions for splits |
| `packages/system-review/src/orchestrator/gates.ts` | Add gate for split-files |
| `workflows/system-review/run.sh` | Increase lock timeout to 18000s |
| `registry.yaml` | Update timeout to 6h, add split-files to stages |

## File-split prompt design

```
You are a TypeScript refactoring expert. Split this file into smaller modules.

RULES:
1. Each output file must be ≤200 lines
2. Maintain all exports from the original file (re-export from barrel)
3. Group related functions/types into cohesive modules
4. Return JSON: { files: [{ path, content }], importsToUpdate: [{ file, oldImport, newImport }] }
5. The original file becomes a barrel that re-exports everything
6. Do NOT change any function signatures or behavior
```

## Concurrency & timeout model

```
┌─────────────────────────────────────────────┐
│ Stage: split-files (timeout: 3h)            │
│                                             │
│  Pool(concurrency=2):                       │
│  ┌──────────┐  ┌──────────┐                 │
│  │ File A   │  │ File B   │  (10min each)   │
│  │ Claude   │  │ Claude   │                 │
│  └──────────┘  └──────────┘                 │
│       ↓             ↓                       │
│  ┌──────────┐  ┌──────────┐                 │
│  │ File C   │  │ File D   │                 │
│  └──────────┘  └──────────┘                 │
│       ...                                   │
│  Each file: Claude API → write files →      │
│             update imports → verify syntax   │
└─────────────────────────────────────────────┘
```

## Verification

1. After implementation, run `pnpm build` in mcp-server to check types
2. Manually trigger system-review with a test file >200 lines
3. Verify the split-files stage runs, Claude produces valid splits
4. Verify self-heal can rollback individual splits if build breaks
