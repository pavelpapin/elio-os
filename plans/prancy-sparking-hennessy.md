# Data Enrichment Workflow — Implementation Plan

## Overview
Orchestrator (Pattern B) workflow: 8 stages, CSV/JSON/Notion input → enriched file + Notion report.
Follows deep-research patterns exactly.

## Phase 1: Infrastructure (~6 files)

| # | File | Lines | Notes |
|---|------|-------|-------|
| 1 | `packages/data-enrichment/package.json` | 30 | deps: @elio/shared, @elio/workflow, zod, csv-parse, csv-stringify |
| 2 | `packages/data-enrichment/tsconfig.json` | 15 | extends tsconfig.base.json |
| 3 | `packages/data-enrichment/src/types.ts` | ~250 | Zod schemas for all 8 stages + PipelineState |
| 4 | `packages/data-enrichment/src/state.ts` | ~65 | File-based state (copy deep-research pattern) |
| 5 | `packages/data-enrichment/src/gates.ts` | ~85 | Gate validators per stage |
| 6 | `packages/data-enrichment/src/llm.ts` | ~170 | Multi-provider LLM (copy from deep-research, change prompt path) |

## Phase 2: Parsers & Exporters (~7 files)

| # | File | Lines | Notes |
|---|------|-------|-------|
| 7 | `packages/data-enrichment/src/parsers/index.ts` | 40 | Auto-detect format dispatcher |
| 8 | `packages/data-enrichment/src/parsers/csv.ts` | 60 | csv-parse, delimiter detection |
| 9 | `packages/data-enrichment/src/parsers/json.ts` | 40 | JSON array parser |
| 10 | `packages/data-enrichment/src/parsers/notion.ts` | 80 | Notion DB via MCP tool |
| 11 | `packages/data-enrichment/src/exporters/index.ts` | 30 | Format dispatcher |
| 12 | `packages/data-enrichment/src/exporters/csv.ts` | 50 | csv-stringify, atomic write |
| 13 | `packages/data-enrichment/src/exporters/json.ts` | 35 | JSON pretty-print, atomic write |

## Phase 3: Stages (~8 files)

| # | File | Lines | LLM? | Key Logic |
|---|------|-------|------|-----------|
| 14 | `stages/discovery.ts` | 70 | Yes | Parse sample, PausedForInput with questions |
| 15 | `stages/planning.ts` | 90 | Yes | Field→tool mappings, batch strategy |
| 16 | `stages/collection.ts` | 150 | Yes | Parallel batch enrichment via MCP tools |
| 17 | `stages/validation.ts` | 100 | Yes | Cross-source conflict detection |
| 18 | `stages/synthesis.ts` | 110 | Yes | Merge data, resolve conflicts, insights |
| 19 | `stages/export.ts` | 70 | No | Write enriched CSV/JSON file |
| 20 | `stages/report.ts` | 120 | Yes | Markdown → Notion page |
| 21 | `stages/verification.ts` | 90 | No | File + Notion + data integrity checks |

## Phase 4: Orchestrator (~2 files)

| # | File | Lines | Notes |
|---|------|-------|-------|
| 22 | `packages/data-enrichment/src/execute.ts` | ~200 | Main loop with resume, gates, progress |
| 23 | `packages/data-enrichment/src/index.ts` | ~30 | Public exports + workflowMeta |

## Phase 5: Documentation (~11 files)

| # | File | Lines | Notes |
|---|------|-------|-------|
| 24 | `workflows/data-enrichment/WORKFLOW.md` | 150 | Full documentation |
| 25 | `workflows/data-enrichment/config.json` | 35 | Timeouts, SLA, providers |
| 26 | `workflows/data-enrichment/run.sh` | 22 | Shell wrapper |
| 27-34 | `workflows/data-enrichment/prompts/*.md` | ~800 total | 8 prompt files (discovery, planning, enricher_company, enricher_person, enricher_generic, validator, synthesizer, report_editor) |

## Phase 6: System Registration (~3 modifications)

| # | File | Action |
|---|------|--------|
| 35 | `registry.yaml` | Add data-enrichment under workflows |
| 36 | `apps/worker/src/workers/workflowExecution.ts` | Register in registerAllWorkflows() |
| 37 | `CLAUDE.md` | Add to Implemented Workflows table |

## Phase 7: Build & Verify

1. `pnpm install` — install new deps
2. `pnpm --filter @elio/data-enrichment build` — compile TypeScript
3. `npx tsx scripts/validate-registry.ts` — check registry
4. Create sample test CSV (5 companies)
5. Smoke test: `workflows/data-enrichment/run.sh sample.csv`

## Totals
- **32 new files** + **3 modified files**
- **~3000 lines** of code and docs
- Implementation order: types → state → gates → llm → parsers → exporters → stages → execute → docs → registration → build
