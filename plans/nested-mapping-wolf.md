# Plan: Унификация BullMQ интеграции

## Проблема
4 компонента обходят BullMQ, запуская процессы напрямую через `child_process.spawn`.
Это противоречит архитектуре "всё через очереди" и лишает нас трекинга, retry, streaming.

---

## 1. Telegram Bot → BullMQ

**Файлы:**
- [services/claude.ts](packages/telegram-bot/src/services/claude.ts) — прямой spawn Claude CLI
- [services/task-runner.ts](packages/telegram-bot/src/services/task-runner.ts) — прямой spawn
- [services/skills.ts](packages/telegram-bot/src/services/skills.ts) — прямой spawn bash
- [services/taskQueue.ts](packages/telegram-bot/src/services/taskQueue.ts) — in-memory queue
- [handlers/messages.ts](packages/telegram-bot/src/handlers/messages.ts) — диспетчер

**Что делаем:**
1. Создать `services/bullmq.ts` — клиент для отправки джобов в BullMQ queues
   - `submitAgentJob(prompt, sessionId?)` → queue `agent-execution`
   - `submitSkillJob(skill, args)` → queue `skill-execution`
   - `subscribeToOutput(workflowId)` → Redis Streams для live updates
2. Переписать `messages.ts`:
   - Вместо `runClaude()` → `submitAgentJob()` + подписка на output stream
   - Вместо `runSkill()` → `submitSkillJob()` + подписка
3. Переписать `taskQueue.ts`:
   - Вместо in-memory queue → отправка в BullMQ
   - `getTask()` → query Redis state
4. Удалить `task-runner.ts` (больше не нужен)
5. `claude.ts` — удалить прямой spawn, оставить только `parseStreamJson` как утилиту
6. Бот подписывается на Redis Streams (`client.subscribeToOutput(workflowId)`) и обновляет сообщение по мере поступления данных
7. agent-execution worker уже пишет в Redis Streams — нужно убедиться что output гранулярный (не только финальный результат)

---

## 2. Scheduler → BullMQ scheduled-tasks

**Файлы:**
- [scheduler/src/index.ts](scheduler/src/index.ts) — standalone cron daemon
- [scheduler/src/executor.ts](scheduler/src/executor.ts) — direct spawn
- [apps/worker/src/workers/scheduledTask.ts](apps/worker/src/workers/scheduledTask.ts) — BullMQ worker

**Что делаем:**
1. Переписать `scheduler/src/executor.ts`:
   - Вместо `spawn('bash', [runScript])` → `client.start('skill-execution', params)`
   - Вместо `spawn('bash', ['-c', command])` → `client.start('agent-execution', params)`
2. Добавить `@elio/workflow` как dependency в `scheduler/package.json`
3. Scheduler остаётся как cron-демон (croner хорош для этого), но execution идёт через BullMQ
4. Альтернатива: перенести все cron jobs в BullMQ `repeat` опцию и убить standalone scheduler — но это сложнее, оставим на потом

---

## 3. MCP deep-research → BullMQ workflow-execution

**Файлы:**
- [mcp-server/src/adapters/deep-research/tools.ts](mcp-server/src/adapters/deep-research/tools.ts) — `execSync(run.sh)`

**Что делаем:**
1. Заменить `execSync(RUNNER)` на `client.start('workflow-execution', { topic, ... })`
2. `deep_research_status` уже читает state.json — можно дополнительно читать из Redis state
3. `deep_research_resume` — нужно добавить поддержку resume в workflow-execution worker или оставить через run.sh как временное решение
4. Добавить `@elio/workflow` как dependency

---

## 4. Legacy `@elio/executor` — анализ и решение

**Файлы:**
- [packages/executor/src/executor.ts](packages/executor/src/executor.ts) — `elio-tasks` queue
- [mcp-server/src/adapters/executor/](mcp-server/src/adapters/executor/) — MCP adapter
- [mcp-server/src/monitor/](mcp-server/src/monitor/) — monitor CLI

**Что делаем:**
1. Проверить: используется ли executor реально (MCP adapter подключён? monitor работает?)
2. Если не используется активно — пометить как deprecated, добавить TODO
3. Если используется — переключить на стандартные queues (agent/skill/workflow-execution)

---

## 5. Обновить CLAUDE.md

- Убрать "Shell / CLI / MCP / Telegram → elio workflow → BullMQ" (пока Telegram не мигрирован)
- Документировать реальные entry points после миграции
- Упомянуть `@elio/executor` как legacy

---

## Порядок выполнения

1. **MCP deep-research** (самый простой, минимум кода)
2. **Scheduler executor** (средняя сложность)
3. **Telegram bot** (самый сложный, нужен streaming)
4. **Legacy executor** (анализ + решение)
5. **Документация**

## Верификация

- Проверить что `elio workflow deep-research "test"` работает через BullMQ
- Проверить что MCP `deep_research` tool использует BullMQ
- Проверить что scheduler jobs идут через queues
- Проверить что telegram бот отправляет задачи в queues
- Запустить `npx tsx scripts/validate-registry.ts`
