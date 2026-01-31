# Plan: Split all files > 200 lines

## Scope
43 files total. Split into 3 batches by severity.

## Batch 1: Files 300+ lines (7 files, highest impact)

### 1. `scripts/sync-backlog-to-notion.ts` (430 → 3 files)
- `scripts/sync-backlog-to-notion/config.ts` — NOTION_DBS, mappings, constants, types
- `scripts/sync-backlog-to-notion/notion-api.ts` — notionRequest, credential loading, property builders
- `scripts/sync-backlog-to-notion/index.ts` — 3 sync functions + main entry

### 2. `config/system.ts` (406 → 3 files)
- `config/types.ts` — all type definitions (StageType, TeamMember, Collector, etc.)
- `config/reviews.ts` — ReviewConfig + nightly reviews + scheduled scripts + standup/weekly
- `config/system.ts` — system settings, stage types, quality gate, dedup, paths, helpers, re-exports

### 3. `packages/executor/src/executor.ts` (397 → 2 files)
- `executor/worker.ts` — Worker management: registerRunner, startWorker, stopWorker, processJob
- `executor/executor.ts` — TaskExecutor class: submit, getStatus, cancel, list, getStats, events

### 4. `packages/deep-research/src/deep-research.ts` (330 → 2 files)
- `deep-research/synthesis.ts` — synthesize, generateSummary, formatAsMarkdown, getSourcesInfo
- `deep-research/deep-research.ts` — Main class + research method orchestrators

### 5. `scripts/day-review/collectors.ts` (326 → 3 files)
- `day-review/error-collector.ts` — collectErrors
- `day-review/metrics-collector.ts` — collectSystemMetrics, checkApiHealth
- `day-review/collectors.ts` — collectGitChanges, collectConversations, collectWorkflowExecutions, re-exports

### 6. `scripts/system-loop/prompts.ts` (316 → 2 files)
- `system-loop/team-prompts.ts` — buildTeamMemberPrompt, buildCollectorPrompt
- `system-loop/prompts.ts` — buildWorkflowPrompt, buildStandupPrompt, buildWeeklySummaryPrompt

### 7. `packages/person-research/src/researcher.ts` (304 → 2 files)
- `person-research/sources.ts` — searchLinkedIn, searchTwitter, searchGitHub, searchWeb
- `person-research/researcher.ts` — researchPerson, generateTalkingPoints, formatAsMarkdown

## Batch 2: Files 250-299 lines (8 files)

### 8. `packages/db/src/repositories/backlog.ts` (298 → 2 files)
- `repositories/backlog-types.ts` — types + interfaces
- `repositories/backlog.ts` — BacklogRepository class

### 9. `scripts/save-report-to-notion.ts` (296 → 2 files)
- `scripts/save-report-to-notion/markdown-to-blocks.ts` — markdownToBlocks converter
- `scripts/save-report-to-notion/index.ts` — notionRequest, createReportPage, main

### 10. `mcp-server/src/adapters/executor/index.ts` (283 → 3 files)
- `adapters/executor/schemas.ts` — Zod schema definitions
- `adapters/executor/tools.ts` — 9 tool definitions
- `adapters/executor/index.ts` — adapter export, combine tools

### 11. `packages/product-review/src/analyzer.ts` (278 → 2 files)
- `product-review/analysis.ts` — calculateQualityScore, getQualityLevel, analyzeFeedback, analyzeErrors, generateRecommendations
- `product-review/analyzer.ts` — runProductReview, formatAsMarkdown

### 12. `packages/deep-research/src/types.ts` (275 → 2 files)
- `deep-research/source-types.ts` — SourceCategory, ContentType, SourceDefinition, etc.
- `deep-research/types.ts` — Query, Execution, Aggregation, Result types + config

### 13. `packages/deep-research/src/source-router.ts` (275 → 2 files)
- `deep-research/scoring.ts` — scoring tables, scoreSource function
- `deep-research/source-router.ts` — selectSources, presets, helpers

### 14. `packages/telegram-bot/src/services/guardian.ts` (274 → 2 files)
- `services/lock-manager.ts` — killConflictingProcesses, clearPendingUpdates, acquireLock, forceAcquireLock
- `services/guardian.ts` — health tracking, types, status functions

### 15. `packages/clients/src/linkedin/oauth.ts` (273 → 2 files)
- `linkedin/auth-server.ts` — startAuthServer, exchangeCode
- `linkedin/oauth.ts` — getCredentials, tokens, getMyProfile, status functions

## Batch 3: Files 250-268 lines (additional 250+ files)

### 16. `packages/skills/src/brutal-audit/index.ts` (268 → 2 files)
### 17. `mcp-server/src/adapters/system/index.ts` (267 → 2 files)
### 18. `packages/shared/src/result.ts` (264 → 2 files)
### 19. `packages/telegram-bot/src/services/taskQueue.ts` (262 → 2 files)
### 20. `packages/clients/src/youtube/transcript.ts` (262 → 2 files)
### 21. `mcp-server/src/adapters/backlog/index.ts` (262 → 2 files)
### 22. `mcp-server/src/adapters/github/index.ts` (250 → 2 files)

## Batch 4: Files 201-249 lines (21 files — minor splits)

These are close to the boundary. Each needs a small extraction (types, helpers, or tool groups) to get under 200.

Files: bootstrap.ts, query-analyzer.ts, circuit-breaker.ts, deep-research/tools.ts, youtube/index.ts, maintenance/index.ts, system-loop/index.ts, process-monitor.ts, telegram/index.ts, linkedin/parsers.ts, healthcheck.ts, voice.ts, auto-test/index.ts, scrapedo/index.ts, notion/index.ts, notion client, brave/index.ts, anysite/types.ts, rate-limiter.ts, shared/index.ts, daily-summary.ts

## Approach
- Split files while preserving all exports (no breaking changes to importers)
- Use re-exports from original file path where needed
- After each batch: `pnpm build` to verify

## Verification
After all splits: `pnpm build` must pass clean. No import errors allowed.
