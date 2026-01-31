# Plan: System Review v2 — Deep System Audit

## Проблема

Текущий System Review делает поверхностный анализ:
- `tsc --noEmit` — просто "компилируется или нет"
- `eslint` — только lint rules
- `wc -l > 200` — тупо считает строки
- `grep` для circular deps — примитивный парсер
- `pnpm audit` — только известные CVE
- `df -h`, `free` — базовая инфра

Не проверяет: качество кода, покрытие тестами, актуальность зависимостей, consistency системы, runtime health интеграций, тренды.

## Решение

Добавить **6 новых collectors** и улучшить **2 существующих**. Не трогаем архитектуру (orchestrator, stages, gates — всё ок). Только расширяем данные.

---

## Новые Collectors

### 1. `test-coverage` collector
**Что:** Запускает `pnpm test -- --coverage` и парсит результат
**Данные:**
- Overall coverage % (lines, branches, functions, statements)
- Файлы с coverage < 50%
- Файлы с 0% coverage (untested)
- Количество тестов (passed/failed/skipped)

### 2. `dependencies` collector
**Что:** Анализирует зависимости глубже чем npm audit
**Данные:**
- Outdated deps (`pnpm outdated --json`) — major/minor/patch
- Dependency tree depth (`pnpm list --depth=10 --json`)
- Duplicate packages
- License check (MIT/Apache ok, GPL/unknown — flag)

### 3. `code-quality` collector
**Что:** Метрики качества кода без LLM
**Данные:**
- Duplicate code detection (jscpd или simple hash-based)
- Cyclomatic complexity per function (через ts-morph или regex heuristic)
- TODO/FIXME/HACK count с файлами и строками
- `any` type usage count
- Console.log statements в production code

### 4. `consistency` collector
**Что:** Проверяет что система Elio OS сама себе не противоречит
**Данные:**
- registry.yaml vs реальные файлы (есть в registry но нет файла? есть файл но нет в registry?)
- WORKFLOW.md/SKILL.md наличие для каждой записи
- packages/ наличие для workflows
- Stale files: .ts файлы не изменявшиеся >90 дней
- Context files (.md) не обновлявшиеся >180 дней

### 5. `runtime-health` collector
**Что:** Проверяет что интеграции реально работают
**Данные:**
- MCP server: `curl localhost:PORT/health` или аналог
- Cron jobs: проверить что crontab entries существуют и последний run был < 48h
- Telegram bot: отправить тестовое сообщение (или просто проверить token validity)
- Notion API: проверить доступ к database
- Secrets: проверить что файлы в /secrets/ существуют и не пустые (НЕ читать содержимое)

### 6. `history` collector
**Что:** Тренды и регрессии
**Данные:**
- Прочитать последние 7 отчётов из `/root/.claude/logs/reviews/system/`
- Извлечь scores
- Trend: improving / stable / degrading
- New issues vs resolved (diff с предыдущим отчётом)

---

## Улучшения существующих

### Architecture collector — добавить:
- **Pattern consistency**: все adapters следуют одной структуре? все имеют index.ts?
- **Module coupling**: сколько файлов импортирует каждый модуль (fan-in/fan-out)

### Security collector — добавить:
- **Outdated Node.js** version check
- **File permissions**: проверить что secrets/ не world-readable

---

## Изменения в файлах

### Новые файлы:
- `packages/system-review/src/collectors/test-coverage.ts`
- `packages/system-review/src/collectors/dependencies.ts`
- `packages/system-review/src/collectors/code-quality.ts`
- `packages/system-review/src/collectors/consistency.ts`
- `packages/system-review/src/collectors/runtime-health.ts`
- `packages/system-review/src/collectors/history.ts`

### Изменить:
- `packages/system-review/src/types.ts` — добавить 6 новых Zod schemas + расширить ReviewData
- `packages/system-review/src/collectors/index.ts` — добавить 6 collectors в `collectAll()`
- `packages/system-review/src/collectors/architecture.ts` — добавить pattern consistency + coupling
- `packages/system-review/src/collectors/security.ts` — добавить node version + file permissions
- `packages/system-review/src/scoring.ts` — добавить scoring rules для новых данных
- `packages/system-review/src/stages/report.ts` — добавить секции в отчёт для новых данных
- `packages/system-review/src/stages/analyze.ts` — обновить промпт для LLM с новыми данными

### Scoring для новых collectors:
```
Test Coverage:
  overall < 30%: -15
  overall < 50%: -8
  overall < 70%: -3
  untested files: -1 each (max 20)

Dependencies:
  major outdated: -3 each
  minor outdated: -1 each (max 10)
  GPL/unknown license: -5 each
  duplicates: -1 each

Code Quality:
  duplicates > 5%: -10
  high complexity functions (>15): -2 each
  `any` types: -1 each (max 15)
  console.log in prod: -1 each (max 5)

Consistency:
  registry mismatch: -5 each
  missing WORKFLOW.md: -3 each
  stale files (>90d): -0.5 each (max 10)

Runtime Health:
  MCP server down: -15
  cron not running: -10
  broken integration: -5 each
  missing/empty secrets: -10 each

History:
  degrading trend (3+ runs): -5
  same critical issues 3+ runs: -3 each
```

---

## НЕ делаем

- Не меняем orchestrator, gates, fix stage, deliver stage
- Не добавляем новые fixers (пока) — только collection + analysis
- Не ставим внешние инструменты (jscpd и тп) — используем grep/awk/simple heuristics
- Не меняем stage pipeline (6 stages остаются)

---

## Verification

1. Запустить `bash /root/.claude/scripts/run-system-review.sh` после изменений
2. Проверить что все 13 collectors (7 старых + 6 новых) отрабатывают без ошибок
3. Проверить что score рассчитывается с учётом новых данных
4. Проверить что отчёт в markdown содержит новые секции
5. Проверить что Notion отчёт создаётся
6. Проверить что при падении нового collector — fallback к default работает
