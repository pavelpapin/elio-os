# Watchdog — Self-Healing System

Автономная система мониторинга и починки scheduled tasks.
Если задача не запустилась — watchdog обнаружит, попытается починить, и алертнёт в Telegram.

## Архитектура

```
┌─────────────────────────────────────────────────┐
│                    Make (Integromat)              │
│                                                   │
│  Scenario 1: Seeder (daily 21:00 UTC)            │
│  └─ POST /watchdog/seed                          │
│     Создаёт expected heartbeats на ближайшие     │
│     24 часа для всех мониторимых задач            │
│                                                   │
│  Scenario 2: Checker (every 5 min)               │
│  └─ GET /watchdog/check                          │
│     Проверяет missed heartbeats → repair → alert │
└───────────────────────┬─────────────────────────┘
                        │ HTTP
                        ▼
┌─────────────────────────────────────────────────┐
│              Watchdog Server (:3847)              │
│                                                   │
│  /watchdog/health  → health check                │
│  /watchdog/check   → check & repair              │
│  /watchdog/status  → dashboard data              │
│  /watchdog/seed    → create expected heartbeats  │
└───────────────────────┬─────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│              Supabase (PostgreSQL)                │
│                                                   │
│  watchdog_heartbeats → expected/started/completed │
│  watchdog_repairs    → repair attempt history     │
└─────────────────────────────────────────────────┘
```

## Как это работает

### 1. Seeder (опережающий)
Make scenario вызывает `/watchdog/seed` ежедневно в 21:00 UTC (до ночных задач).
Seeder читает `config.json`, парсит cron, создаёт записи `status=expected` в Supabase.

### 2. Heartbeat (из задачи)
Когда scheduled task запускается, он вызывает `watchdog.markStarted(taskName)`.
Когда завершается — `watchdog.markCompleted(taskName)`.
При ошибке — `watchdog.markFailed(taskName, error)`.

### 3. Checker (проверяющий)
Make scenario вызывает `/watchdog/check` каждые 5 минут.
Checker находит heartbeats со `status=expected` где `expected_at + graceMinutes < NOW()`.
Помечает их как `missed` и запускает repair.

### 4. Repair (починка)
Эскалирующая стратегия:
1. **retry** — перекидывает задачу в BullMQ очередь
2. **restart_worker** — диагностика + retry
3. **escalate** — подробный алерт в Telegram с историей

`maxRetries` и `retryBackoffMinutes` настраиваются в `config.json`.

## Настройка Make

### API Key
```
WATCHDOG_API_KEY=7001ae96-a597-464f-bd7a-0834c4bb00fe
```

### Scenario 1: Watchdog Seeder
1. Trigger: **Schedule** → Daily at 21:00 UTC
2. Module: **HTTP Make a request**
   - URL: `http://YOUR_SERVER:3847/watchdog/seed?key=YOUR_API_KEY`
   - Method: POST
3. Module: **Filter** → if `seeded` array length > 0
4. Module: (optional) Log to Google Sheets

### Scenario 2: Watchdog Checker
1. Trigger: **Schedule** → Every 2 hours (120 min)
   > 12 checks/day × 30 = 360 + 30 seeder = **390 ops/month** (free tier: 1000)
2. Module: **HTTP Make a request**
   - URL: `http://YOUR_SERVER:3847/watchdog/check?key=YOUR_API_KEY`
   - Method: GET
3. Module: **Filter** → if `ok` = false
4. Module: (optional) Additional actions (email, Slack, etc.)

> **Telegram алерт уже встроен** в checker. Make нужен только как триггер.

## Config

```json
{
  "monitors": [
    {
      "name": "nightly-consilium",
      "cron": "0 22 * * *",
      "graceMinutes": 15,
      "maxRetries": 3,
      "repairActions": ["retry", "restart_worker", "escalate"]
    }
  ]
}
```

Полный config: `watchdog/config.json`

## Файлы

| Файл | Назначение |
|------|-----------|
| `config.json` | Что мониторить, таймауты, retry policy |
| `server.ts` | HTTP сервер (Hono) для Make |
| `checker.ts` | Проверка missed heartbeats + repair |
| `repair.ts` | Логика починки (retry → escalate) |
| `seeder.ts` | Создание expected heartbeats |
| `utils.ts` | Загрузка конфига |

## Database

Migration: `mcp-server/migrations/004_watchdog.sql`

### watchdog_heartbeats
| Column | Type | Description |
|--------|------|-------------|
| task_name | TEXT | Имя задачи |
| expected_at | TIMESTAMPTZ | Когда должна запуститься |
| started_at | TIMESTAMPTZ | Когда реально запустилась |
| completed_at | TIMESTAMPTZ | Когда завершилась |
| status | TEXT | expected/started/completed/failed/missed/repaired |
| error | TEXT | Текст ошибки |

### watchdog_repairs
| Column | Type | Description |
|--------|------|-------------|
| heartbeat_id | UUID | FK на heartbeat |
| task_name | TEXT | Имя задачи |
| action | TEXT | retry/restart_worker/escalate/skip |
| attempt | INTEGER | Номер попытки |
| result | TEXT | success/failed/pending |
| diagnosis | JSONB | Диагностическая информация |

## Запуск

```bash
# Запустить watchdog server
WATCHDOG_API_KEY=your-key npx tsx watchdog/server.ts

# Ручная проверка
curl http://localhost:3847/watchdog/check?key=your-key

# Ручной seed
curl -X POST http://localhost:3847/watchdog/seed?key=your-key

# Статус
curl http://localhost:3847/watchdog/status?key=your-key
```

## Что происходит при сбое

```
22:00 UTC — Consilium должен запуститься
  └─ Seeder уже создал heartbeat (status=expected)

22:15 UTC — Make checker: expected_at + 15min < NOW? Да!
  └─ Checker: mark as missed → repair attempt 1 (retry)
  └─ Telegram: "🔄 Retrying nightly-consilium (attempt 1)"

22:20 UTC — Make checker: всё ещё missed?
  └─ Repair attempt 2 (restart_worker + retry)
  └─ Telegram: "⚠️ Worker restart needed"

22:35 UTC — Make checker: всё ещё missed?
  └─ Repair attempt 3 (escalate)
  └─ Telegram: "🚨 ESCALATION: nightly-consilium
     Попыток починки: 3
     Последний успех: 27.01 22:05
     ⚡ Требуется ручное вмешательство"
```
