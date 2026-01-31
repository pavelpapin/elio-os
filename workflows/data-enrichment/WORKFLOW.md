# Workflow: DataEnrichment v1.0

Автономная система обогащения данных через внешние API.
Принимает CSV/JSON/Notion, обогащает через LinkedIn, Perplexity, YouTube, веб-поиск.
Результат: обогащённый файл + отчёт в Notion.

---

## Principles

1. **Batch processing** — записи обрабатываются пакетами для rate limiting
2. **Multi-source** — каждый факт из ≥1 источника с confidence score
3. **Data integrity** — atomic writes, verification на каждом этапе
4. **Resume support** — можно продолжить с любой стадии

---

## Trigger

- `data-enrichment input.csv`
- `data-enrichment --resume <run_id>`
- `data-enrichment --resume <run_id> --input answers.json`

---

## Workflow Overview

```
Stage 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7
Discovery → Planning → Collection → Validation → Synthesis → Export → Report → Verification
```

---

## Stage Gates

| From | To | Gate Condition |
|------|----|----------------|
| Start | Stage 0 | — |
| Stage 0 | Stage 1 | Brief confirmed by user |
| Stage 1 | Stage 2 | Field mappings + batch strategy defined |
| Stage 2 | Stage 3 | ≥80% records processed |
| Stage 3 | Stage 4 | Average quality score ≥ 0.7 |
| Stage 4 | Stage 5 | Enrichment coverage ≥ 50% |
| Stage 5 | Stage 6 | File exists, size > 0 |
| Stage 6 | Stage 7 | Notion page or local report exists |
| Stage 7 | Done | All verification checks pass |

---

## Stages

| # | Name | Purpose | LLM? |
|---|------|---------|------|
| 0 | Discovery | Parse sample data, ask user what to enrich | Yes + Interactive |
| 1 | Planning | Create field→tool mappings, batch strategy | Yes |
| 2 | Collection | Parallel batch enrichment via MCP tools | Yes |
| 3 | Validation | Cross-source conflict detection, quality scoring | Yes |
| 4 | Synthesis | Merge data, resolve conflicts, generate insights | Yes |
| 5 | Export | Write enriched CSV/JSON file | No |
| 6 | Report | Generate markdown → Notion page | Yes |
| 7 | Verification | File + Notion + data integrity checks | No |

---

## Input Formats

- **CSV** — auto-detect delimiter (comma, semicolon, tab)
- **JSON** — array of objects
- **Notion DB** — URL or `notion:db_id`

## Output

1. Enriched file (CSV or JSON) at `logs/workflows/data-enrichment/{run_id}/enriched.{format}`
2. Notion report page with summary, quality metrics, insights

---

## Available Tools

| Tool | Provider | Purpose |
|------|----------|---------|
| elio_perplexity_search | Perplexity | General enrichment queries |
| elio_linkedin_profile | LinkedIn | Person data enrichment |
| elio_linkedin_search | LinkedIn | Company/person search |
| elio_youtube_search | YouTube | Video/channel data |
| elio_web_search | Web | General web search |
| WebSearch | DuckDuckGo | Fallback web search |
| WebFetch | Direct | Read specific URLs |

---

## Config

See [config.json](config.json) for timeouts, SLA, LLM providers.

---

## Logs

`/root/.claude/logs/workflows/data-enrichment/{run_id}/`
