# Workflow Standard v4.0

**Дата:** 2026-01-28
**Registry:** `/root/.claude/registry.yaml` — проверь перед созданием.

Единый стандарт для всех workflows в Elio OS. Нарушение = баг.

---

## 1. Три сущности, архитектура

```
registry.yaml          <- source of truth (проверь ПЕРЕД созданием)
│
├── SKILL              <- атомарная операция (1 шаг, без state)
│   docs:  skills/{name}/SKILL.md
│   code:  packages/{name}/ (или prompt-only)
│
├── WORKFLOW           <- multi-stage процесс (>=2 стадий, state)
│   docs:  workflows/{name}/WORKFLOW.md
│   code:  packages/{name}/ (TypeScript пакет)
│   shell: workflows/{name}/run.sh (env + lock + вызов)
│
└── CONNECTOR          <- адаптер к внешнему API (без бизнес-логики)
    code:  mcp-server/src/adapters/{name}/
```

**НЕ СУЩЕСТВУЕТ:** agents, pipelines, modules, services — всё это skill или workflow.

---

## 2. Архитектура: Docs + Code раздельно

### Принцип

| Concept | Location | Contains | Analogy |
|---------|----------|----------|---------|
| **Workflow docs** | `workflows/{name}/` | WORKFLOW.md, prompts, run.sh | Recipe (WHAT to cook) |
| **Workflow code** | `packages/{name}/` | TypeScript код, types, tests | Tools (HOW to cook) |

**Workflow** описывает ЧТО делать (шаги, порядок, inputs/outputs).
**Package** содержит КАК делать (TypeScript функции).

### Структура workflow (docs)

```
workflows/{name}/
├── WORKFLOW.md                <- документация, стадии, SLA
├── workflow.json              <- (опционально) declarative definition
├── run.sh                     <- shell wrapper (env + lock + вызов)
├── prompts/                   <- LLM промпты (.md)
└── steps/                     <- (опционально) step definitions
```

### Структура package (code)

```
packages/{name}/
├── package.json               <- @elio/{name}
├── tsconfig.json
├── src/
│   ├── index.ts               <- public API exports
│   ├── runner.ts              <- CLI entry point (если нужен)
│   ├── types.ts               <- Zod schemas + types
│   ├── stages/                <- one file per stage
│   │   ├── collect.ts
│   │   ├── analyze.ts
│   │   └── ...
│   └── [domain modules]       <- collectors/, fixers/, etc.
├── dist/                      <- compiled output
└── tests/
```

### Почему раздельно?

1. **Пакеты в pnpm workspace** — `packages/*` включён, можно импортировать как `@elio/{name}`
2. **MCP adapters импортируют пакеты** — `import { analyze } from '@elio/system-review'`
3. **Build caching** — pnpm кэширует сборку
4. **Переиспользование** — один пакет может использоваться несколькими workflows
5. **Типы доступны** — compiled types в dist/

---

## 3. Execution Architecture: BullMQ Pipeline

**Все entry points выполняются через BullMQ pipeline:**

```
CLI (elio workflow/skill) ─┐
MCP adapters ──────────────┤
Telegram bot ──────────────┼─> BullMQ queues ─> apps/worker (consumers)
Scheduler (cron) ──────────┘        │
                                    ├─> agent-execution (concurrency: 4)
                                    ├─> skill-execution (concurrency: 4)
                                    ├─> workflow-execution (concurrency: 2)
                                    └─> scheduled-tasks (concurrency: 2)
                                          │
                                          └─> packages/{name}/src/execute.ts
                                                └─> ProgressReporter → Redis (state + streams)
```

**Принцип:** Workflow package экспортирует `execute*()` функцию, которая принимает `ProgressAdapter`.
Worker вызывает эту функцию и передаёт `ProgressReporter` из `@elio/workflow`.
State и streaming идут через Redis (db 1: streams, db 2: state).

### LLM паттерны внутри workflow

#### Паттерн A: Hybrid (LLM = 1 reasoning step)

LLM нужен для **анализа**, остальное детерминистично.

```
execute.ts
  ├─> Collect (deterministic)
  ├─> Analyze (LLM call via API)
  ├─> Fix (deterministic)
  ├─> Verify (deterministic)
  ├─> Report (deterministic)
  └─> Deliver (deterministic)
```

**Пример:** system-review — `packages/system-review/src/execute.ts`

#### Паттерн B: Orchestrator (LLM on multiple stages)

LLM нужен на **нескольких стадиях**, state machine с Zod-валидацией.

```
execute.ts
  ├─> Stage 1: discovery   (LLM)
  ├─> Stage 2: planning    (LLM)
  ├─> Stage 3: collection  (LLM × N agents parallel)
  ├─> Stage 4: factcheck   (LLM)
  ├─> Stage 5: synthesis   (LLM)
  ├─> Stage 6: report      (deterministic + LLM)
  └─> Stage 7: review      (LLM × 3 models)
```

**Пример:** deep-research — `packages/deep-research/src/execute.ts`

### Что НЕ допускается

- Прямой запуск `npx tsx runner.ts` (только через BullMQ)
- Bash-скрипт с inline-логикой (if/else, парсинг, оркестрация стадий)
- Скрипт, который вызывает Claude CLI для оркестрации
- Код workflow в `workflows/` (код только в `packages/`)
- Код (ts/js) в `skills/` (только docs)
- Новая папка верхнего уровня для "нового типа сущности"
- File-based state как primary storage (Redis — primary, files — backup only)

---

## 4. Shell wrapper — максимум 20 строк

```bash
#!/bin/bash
set -uo pipefail
cd /root/.claude

[ -f "secrets/.env" ] && export $(grep -v '^#' secrets/.env | xargs 2>/dev/null) || true

LOCK="/tmp/elio-{name}.lock"
[ -f "$LOCK" ] && exit 1
echo $$ > "$LOCK"
trap "rm -f $LOCK" EXIT

npx tsx elio/src/cli.ts workflow {name} "$@"
```

---

## 5. Stages & Gates

### Обязательные правила

1. **Стадии выполняются строго по порядку** — нельзя перескакивать
2. **Каждая стадия имеет Gate Condition** — условие перехода
3. **Stage 0 = Discovery** — сбор требований (если workflow interactive)
4. **Последняя стадия = Verification** — проверка deliverable
5. **Zod-валидация** на входе/выходе каждой стадии

### Gate pattern

```typescript
interface Gate {
  from: StageName;
  to: StageName;
  check: (state: WorkflowState) => boolean;
}
```

### Discovery stage (для interactive workflows)

Все вопросы задаются **ОДНИМ блоком** (до 10 штук). Не по одному.

```
ЗАПРЕЩЕНО: вопросы по одному, несколько сообщений
ОБЯЗАТЕЛЬНО: все вопросы сразу, один ответ, Brief -> подтверждение
```

---

## 6. Observability (ОБЯЗАТЕЛЬНО)

### Telegram notifications

```typescript
await notify(`Started: ${name}`);           // старт
await notify(`Stage ${i}/${n}: ${stage}`);  // каждая стадия
await notify(`Completed: ${name}\n${url}`); // завершение
await notify(`Failed: ${name}\n${error}`);  // ошибка
```

### File logging

```typescript
const logger = createFileLogger(workflowName, runId);
logger.info('Starting stage', { stage });
logger.error('Stage failed', { error });
```

Логи: `/root/.claude/logs/workflows/{name}/{run_id}/`

### Issue logging (семантические проблемы)

| Type | Когда |
|------|-------|
| `data_source_failed` | Источник вернул пустой результат |
| `data_conflict` | Разные источники противоречат |
| `verification_failed` | Факт не подтверждён 2+ источниками |
| `rate_limited` | Достигли лимита API |
| `quality_low` | Результат низкого качества |

---

## 7. Verification (ОБЯЗАТЕЛЬНО)

**НИКОГДА** не говорить "готово" без проверки.

```typescript
const result = await verify({
  type: 'notion_page',
  pageId,
  minBlocks: 15,
  requiredHeadings: ['Summary', 'Recommendations']
});

if (!result.ok) {
  // retry до 3 раз с exponential backoff
}
```

| Deliverable | Проверка |
|-------------|----------|
| Notion page | Существует, >N блоков, нужные заголовки |
| File | Существует, >N байт, нужный контент |
| Email | Отправлен, есть message_id |
| API response | Status 200, нужные поля |

---

## 8. Error Handling & Rate Limiting

**Implementations (canonical source: `@elio/shared`):**
- `withRateLimit()` -> `packages/shared/src/resilience/rate-limiter.ts`
- `withCircuitBreaker()` -> `packages/shared/src/resilience/circuit-breaker.ts`
- `withResilience()` -> combines both (convenience wrapper)
- `notify()` -> `packages/shared/src/notify.ts`
- `createFileLogger()` -> `packages/shared/src/file-logger.ts`

```typescript
import { withRateLimit, withCircuitBreaker, withResilience } from '@elio/shared';

// Rate limiting — обязателен для всех внешних API
// Вариант 1: withResilience (rate limit + circuit breaker вместе)
const result = await withResilience('perplexity', () => perplexitySearch(query));

// Вариант 2: раздельно (если нужен только один)
const result2 = await withRateLimit('perplexity', () =>
  withCircuitBreaker('perplexity', () =>
    perplexitySearch(query)
  )
);

// Graceful degradation — некритичные ошибки не останавливают workflow
let youtubeData = null;
try {
  youtubeData = await fetchYoutubeTranscript(url);
} catch {
  logger.warn('YouTube failed, continuing without');
}
```

---

## 9. Deliverables

Workflow **ОБЯЗАН** вернуть конкретный URL или path:

```typescript
return {
  success: true,
  deliverable: { type: 'notion_page', url: '...', verified: true }
};
```

Приоритет: **Notion > Google Docs > Local files**

---

## 10. Existing Workflows

| Workflow | Паттерн | Code | Docs | Status |
|----------|---------|------|------|--------|
| system-review | A (Hybrid) | `packages/system-review/` | `workflows/system-review/` | OK |
| deep-research | B (Orchestrator) | `packages/deep-research/` | `workflows/deep-research/` | OK |

---

## 11. Checklist

### Новый workflow

- [ ] Прочитал `registry.yaml` — нет дубля
- [ ] Добавил запись в `registry.yaml`
- [ ] Выбрал паттерн (A: Hybrid или B: Orchestrator)
- [ ] Код в `packages/{name}/` с package.json
- [ ] Docs в `workflows/{name}/WORKFLOW.md`
- [ ] Shell wrapper `workflows/{name}/run.sh` <=20 строк (submits to BullMQ)
- [ ] `execute.ts` с `ProgressAdapter` interface
- [ ] Зарегистрирован в `apps/worker/src/workers/workflowExecution.ts`
- [ ] Zod schemas для state
- [ ] Gates между стадиями
- [ ] Telegram notifications
- [ ] File logging
- [ ] Verification stage (последняя)
- [ ] Rate limiting для внешних API
- [ ] Deliverable возвращает URL
- [ ] Тесты

### Модификация

- [ ] Изменение логики -> `packages/{name}/src/`
- [ ] Обновить WORKFLOW.md если стадии изменились
- [ ] Не трогать shell wrapper (только если entry point изменился)
- [ ] Запустить тесты

---

## TL;DR

```
registry.yaml                    <- проверь перед созданием
packages/{name}/src/             <- ЗДЕСЬ код workflow (TypeScript)
workflows/{name}/WORKFLOW.md     <- документация
workflows/{name}/run.sh          <- env + lock + elio workflow {name}
skills/{name}/SKILL.md           <- только документация (без кода)
```

**Единый execution path:** Shell → elio CLI → BullMQ → Worker → execute.ts → Redis state/streams

**Два LLM паттерна:**
- **Hybrid** (system-review): 1 LLM call между детерминистичными фазами
- **Orchestrator** (deep-research): LLM на каждой стадии, state machine

**Одна точка правды. Code в packages/. Docs в workflows/. Execution через BullMQ. Без исключений.**
