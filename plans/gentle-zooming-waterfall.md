# Fix: Deep Research Workflow — Stage Execution & Notion Output

## Problem

Workflow документирует 7 стадий (Stage 0-6), каждая с gate conditions, structured output, quality checks. Но сейчас всё работает как один черный ящик MCP tool call `deep_research()` — без Discovery вопросов, без fact checking, без Devil's Advocate, без Notion отчета.

## Root Cause

Две разные архитектуры смешались:
1. **Stage docs** (stages/0-6) описывают **Claude-as-orchestrator** workflow — Claude читает стадию, выполняет, проверяет gate, переходит дальше
2. **Code** (`@elio/deep-research`) — programmatic pipeline без стадий, без LLM, без Notion

MCP tool `deep_research()` вызывает code pipeline, полностью игнорируя stage docs.

## Solution

**Подход: Claude-orchestrated workflow с MCP tools как building blocks**

Когда пользователь говорит "запусти Deep Research", Claude должен:
1. Прочитать stage docs
2. Выполнить каждую стадию последовательно, используя MCP tools как инструменты
3. Показывать output каждой стадии
4. Проверять gate conditions
5. Сохранить финальный отчет в Notion

### Что менять

#### 1. Новый MCP tool: `elio_deep-research_run_stage` (НЕ нужен)
Стадии выполняет Claude, читая docs. Новый tool не нужен — нужно правильно использовать существующие tools.

#### 2. Создать workflow runner script: `workflows/deep-research/run.md`
Единая инструкция которую Claude читает и выполняет step-by-step. Ссылается на stage docs.

#### 3. Изменения в коде

**Файл: `mcp-server/src/adapters/deep-research/tools.ts`**
- Добавить tool `save_report` — сохраняет research результат в Notion
- Использует `@elio/clients/notion` для создания страницы

**Файл: `packages/deep-research/src/deep-research.ts`**
- Добавить метод `runDiscovery(query)` — возвращает structured analysis (уже есть как `analyzeQuery`)
- Добавить метод `runPlanning(brief)` — возвращает plan с subtopics (расширить `selectSources`)
- Остальные стадии (fact-check, synthesis, devil's advocate) выполняются Claude через промпты — НЕ в коде

#### 4. Stage execution tracking

**Файл: новый `mcp-server/src/adapters/deep-research/tools.ts` tool: `stage_complete`**
- Записывает завершение стадии в `workflow_runs` таблицу
- Input: research_id, stage_name, stage_output (JSON)
- Позволяет отслеживать прогресс и resumability

### Конкретные файлы

| Файл | Действие |
|------|----------|
| `workflows/deep-research/run.md` | **Создать** — пошаговая инструкция для Claude |
| `mcp-server/src/adapters/deep-research/tools.ts` | **Изменить** — добавить `save_report` и `stage_complete` tools |
| `mcp-server/src/adapters/deep-research/schemas.ts` | **Изменить** — добавить schemas для новых tools |
| `packages/deep-research/src/deep-research.ts` | **Минимальные изменения** — expose stage methods отдельно |

### Как будет работать

```
Пользователь: "Запусти Deep Research по теме X"

Claude:
1. Читает workflows/deep-research/run.md
2. STAGE 0 — DISCOVERY:
   - Задает 10-12 вопросов одним блоком (из stage 0 docs)
   - Получает ответы
   - Формирует Research Brief JSON
   - Просит подтверждение

3. STAGE 1 — PLANNING:
   - Анализирует brief
   - Определяет subtopics
   - Вызывает research_plan tool
   - Показывает план пользователю

4. STAGE 2 — COLLECTION:
   - Вызывает deep_research tool с правильными параметрами
   - Дополнительно: targeted searches через quick_research для каждого subtopic

5. STAGE 3 — FACT CHECK:
   - Claude сам cross-references факты
   - Маркирует verified/unverified/rejected

6. STAGE 4 — SYNTHESIS:
   - Claude формирует key findings, scenarios, recommendations
   - Применяет "So What?" test

7. STAGE 5 — DEVIL'S ADVOCATE:
   - Claude находит контраргументы, риски, failed examples

8. STAGE 6 — REPORT:
   - Вызывает save_report tool → создает Notion page
   - Возвращает URL пользователю
```

### Verification

1. Запустить "Deep Research по теме AI в Real Estate в Дубае"
2. Проверить что Discovery спрашивает вопросы
3. Проверить что каждая стадия показывает output
4. Проверить что отчет сохранен в Notion
5. Проверить что `workflow_runs` содержит записи стадий
