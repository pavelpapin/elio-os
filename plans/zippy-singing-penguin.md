# Data Enrichment Workflow — Implementation Plan

## Overview

Новый workflow по паттерну Orchestrator (B), как deep-research. Принимает данные в любом формате (CSV/JSON/Notion), обогащает через внешние API (Perplexity, LinkedIn, YouTube, web search), выдаёт enriched файл + Notion отчёт.

## Stages (8)

| # | Stage | Тип | Что делает |
|---|-------|-----|------------|
| 0 | Discovery | Interactive (PausedForInput) | Парсит sample данных, спрашивает юзера что enrichить и какими инструментами |
| 1 | Planning | LLM | Создаёт план: маппинг полей → инструменты, output schema, batch strategy |
| 2 | Collection | LLM × 3-5 parallel | Батчами по 3-5 записей параллельно обогащает через API с rate limiting |
| 3 | Validation | LLM | Проверяет конфликты, confidence, помечает проблемные записи |
| 4 | Synthesis | LLM | Мержит данные, резолвит конфликты, генерит insights |
| 5 | Export | Deterministic | Пишет enriched CSV/JSON файл |
| 6 | Report | LLM + MCP | Генерит markdown отчёт → Notion страница |
| 7 | Verification | Deterministic | Проверяет файл + Notion + data integrity |

## File Structure

### Code: `packages/data-enrichment/src/`

```
index.ts              — exports: workflowMeta, executeDataEnrichment
execute.ts            — main orchestrator (stage loop, gates, progress)
types.ts              — Zod schemas for all stages
state.ts              — file-based state persistence (atomic save/load)
gates.ts              — gate validation per stage
parsers/
  index.ts            — universal dispatcher (detect format → parse)
  csv.ts              — CSV parser (csv-parse)
  json.ts             — JSON parser
  notion.ts           — Notion DB reader via MCP
exporters/
  index.ts            — dispatcher
  csv.ts              — CSV writer (csv-stringify)
  json.ts             — JSON writer
stages/
  discovery.ts        — interactive brief, PausedForInput
  planning.ts         — enrichment plan creation
  collection.ts       — parallel batch enrichment
  validation.ts       — cross-check, flag conflicts
  synthesis.ts        — merge, resolve, insights
  export.ts           — write enriched file
  report.ts           — markdown + Notion page
  verification.ts     — final checks
```

### Docs: `workflows/data-enrichment/`

```
WORKFLOW.md           — documentation
run.sh                — shell wrapper (≤20 lines)
config.json           — timeouts, SLA, tool config
prompts/
  discovery.md        — discovery questions prompt
  planning.md         — planning prompt
  enricher_company.md — company enrichment
  enricher_person.md  — person enrichment
  enricher_generic.md — generic enrichment
  validator.md        — validation prompt
  synthesizer.md      — synthesis prompt
  report_editor.md    — report generation
```

### Also modify:

- `registry.yaml` — добавить data-enrichment workflow entry
- `apps/worker/src/workers/workflowExecution.ts` — регистрация в registerAllWorkflows()
- `packages/data-enrichment/package.json` — @elio/data-enrichment с deps
- `packages/data-enrichment/tsconfig.json`

## Key Design Decisions

1. **LLM вызовы** — через существующий `llm.ts` из deep-research (реэкспорт или копия с адаптацией)
2. **Rate limiting** — `withResilience()` из `@elio/shared` для всех внешних API
3. **Parallel collection** — `Promise.allSettled()` батчами по 3-5, батчи последовательно
4. **Input parsing** — auto-detect по расширению файла / URL pattern
5. **Output** — и файл (CSV/JSON по выбору юзера), и Notion summary page
6. **State** — file-based как в deep-research + Redis через ProgressAdapter

## Gates

| Stage → | Gate Condition |
|---------|---------------|
| Discovery → Planning | `confirmed_by_user === true` |
| Planning → Collection | `batch_size > 0 && output_schema defined` |
| Collection → Validation | `≥80% records processed` |
| Validation → Synthesis | `average_quality_score ≥ 0.7` |
| Synthesis → Export | `≥90% records have ≥1 enrichment` |
| Export → Report | `file exists && size > 0` |
| Report → Verification | `notion_url exists || file fallback` |
| Verification → Done | `all checks pass` |

## Dependencies

```json
{
  "@elio/shared": "workspace:*",
  "@elio/workflow": "workspace:*",
  "zod": "^3.22.4",
  "csv-parse": "^5.5.3",
  "csv-stringify": "^6.4.5"
}
```

## Rollout Order

1. Registry entry + validate
2. Package skeleton (package.json, tsconfig)
3. types.ts (all Zod schemas)
4. state.ts, gates.ts
5. parsers/ (CSV, JSON, Notion)
6. stages/ (discovery → verification, по порядку)
7. execute.ts (orchestrator)
8. index.ts (exports)
9. exporters/
10. Prompts (8 файлов)
11. WORKFLOW.md, run.sh, config.json
12. Worker registration
13. pnpm install + build

## Verification

- `npx tsx scripts/validate-registry.ts` — registry valid
- `pnpm --filter @elio/data-enrichment build` — компилится
- Тест с sample CSV (3-5 записей) → enriched CSV + Notion page
