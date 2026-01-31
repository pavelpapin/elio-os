# @elio/db

Database layer for Elio OS using Supabase (PostgreSQL).

## Features

- Repository pattern for all tables
- Typed queries with TypeScript
- Connection pooling via Supabase

## Usage

```typescript
import { getDb } from '@elio/db';

const db = getDb();

// Tasks (GTD)
const tasks = await db.task.getActive();
const inbox = await db.task.getInbox();
await db.task.create({ title: 'New task', status: 'inbox' });

// Workflow runs
const runs = await db.workflow.getRecent(10);
const stats = await db.workflow.getStats();

// Scheduled tasks
const schedules = await db.schedule.getEnabled();
const due = await db.schedule.getDue();

// System state (key-value)
const value = await db.state.get('key');
await db.state.set('key', { data: 'value' });

// Messages (inbox from all sources)
const messages = await db.message.getUnprocessed();
await db.message.markProcessed(messageId);
```

## Tables

| Table | Description |
|-------|-------------|
| `tasks` | GTD task management |
| `workflow_runs` | Execution history |
| `scheduled_tasks` | Cron/scheduled jobs |
| `messages` | Inbox from all sources |
| `system_state` | Key-value store |
| `backlog_items` | CTO/CPO backlog |
| `people` | CRM contacts |
| `audit_log` | Security tracking |

## Configuration

Credentials are read from `/root/.claude/secrets/supabase.json`:

```json
{
  "url": "https://your-project.supabase.co",
  "service_key": "your-service-role-key"
}
```

Or via environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
