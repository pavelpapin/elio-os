# System Review — Orchestrator Implementation Plan

## Goal
Add TypeScript state machine orchestrator to `packages/system-review/`. Same pattern as deep-research. Add gates, observability, tests. Keep bash script for backward compatibility.

## Pipeline (6 stages)

```
Collect → Analyze → Fix → Verify → Report → Deliver
                           |         |
                           |     build fail → Rollback, set rolledBack=true, continue to Report+Deliver
                           |
                       all collectors default → gate blocks
```

No self-correction loop. If build fails after fix → rollback → report the failure. Correct for nightly auto-fix.

## Files to Create (all in `packages/system-review/`)

### `src/orchestrator/types.ts` (~60 lines)
- `StageId`: `collect | analyze | fix | verify | report | deliver`
- `StageConfig`, `GateResult`, `StageOutput`, `ExecutionContext`
- `OrchestratorState` (includes `rolledBack` flag)
- `FileLogger` interface (same as deep-research)

### `src/orchestrator/schemas.ts` (~70 lines)
- `CollectOutputSchema` — wraps `ReviewDataSchema`
- `AnalyzeOutputSchema` — wraps `FixPlanSchema`
- `FixOutputSchema` — `{ results: FixResult[], headBefore: string }`
- `VerifyOutputSchema` — `{ buildPassed, testsPassed, buildOutput, testOutput, diffStats }`
- `ReportOutputSchema` — `{ markdown: string (min 100), telegram: string, score: number }`
- `DeliverOutputSchema` — `{ reportPath: string, telegramSent: boolean, notionUrl?: string }`

### `src/orchestrator/gates.ts` (~70 lines)
- `collectGate`: ReviewData has at least 1 non-default collector (git.headSha !== 'unknown' OR typescript.errorCount > 0 OR eslint has issues)
- `analyzeGate`: FixPlan schema valid (always passes — conservative plan is valid)
- `fixGate`: always passes
- `verifyGate`: if fixes were applied AND buildPassed=false → `{ canProceed: false }` (triggers rollback handling in orchestrator)
- `reportGate`: markdown.length ≥ 100
- `deliverGate`: reportPath not empty

### `src/orchestrator/index.ts` (~140 lines)
`SystemReviewOrchestrator` class:
- Same DI pattern: injected executors + hooks
- `execute()`: sequential stages with gates
- **Verify special handling**: if verify gate fails, call `rollback()`, set `state.rolledBack = true`, then **continue** to report + deliver (report includes rollback info)
- No retry (nightly run — simpler model)
- Progress hooks for Telegram

### `src/stages/collect.ts` (~15 lines) — wraps `collectAll()`
### `src/stages/analyze.ts` (~20 lines) — wraps `buildConservativePlan()` (LLM is external)
### `src/stages/fix.ts` (~20 lines) — wraps `applyFixes()`, records headBefore
### `src/stages/verify.ts` (~15 lines) — wraps `verify()`
### `src/stages/report.ts` (~20 lines) — wraps `generateMarkdownReport()` + `generateTelegramSummary()`
### `src/stages/deliver.ts` (~25 lines) — writes file, sends Telegram

## Tests

### `tests/gates.test.ts` (~100 lines)
- collectGate: pass with real git data, fail with all defaults
- verifyGate: pass when build OK, fail when build broken after fixes, pass when no fixes applied
- reportGate: pass with content, fail with empty

### `tests/orchestrator.test.ts` (~150 lines)
- Full pipeline with mocked stages — all complete
- collect gate blocks when all-defaults
- verify fail → rollback → report+deliver still run with rolledBack=true
- Hooks called in order

### `tests/scoring.test.ts` (~60 lines)
- Known inputs → expected scores
- Health level thresholds

## Modify
- `package.json` — add `vitest` devDep, `test` script, `zod` dep
- `src/index.ts` — add orchestrator + stage exports

## NOT changing
- `scripts/run-system-review.sh` — keep as-is
- Existing collectors, fixers, verify, report, scoring, exec — untouched
- MCP adapter, analyzer/ — untouched

## Verification
1. `npx vitest run` — all tests pass
2. `npx tsc --noEmit` — TypeScript compiles
