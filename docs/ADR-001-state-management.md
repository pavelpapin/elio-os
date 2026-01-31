# ADR-001: State Management Strategy

**Date:** 2026-01-28
**Status:** Accepted
**Context:** System has 4 different state storage mechanisms with no documented policy

---

## Decision

### Three Storage Tiers

| Tier | Technology | When to Use | TTL | Example |
|------|-----------|-------------|-----|---------|
| **Ephemeral** | BullMQ + Redis | Workflow job state, queues, real-time signals | Minutes-hours | Job progress, cancel signals, output streams |
| **Persistent** | Supabase (PostgreSQL) | Cross-session data, queryable, audit trail | Permanent | workflow_runs, tasks, people, audit_log |
| **Local Config** | JSON files | Development config, local-only state | Session | secrets/*.json, state/*.json (dev only) |

### Rules

1. **Default to Supabase** for any data that should survive restarts
2. **Use Redis/BullMQ** only for workflow execution state that is inherently temporary
3. **Never use JSON files** for production state — they don't survive deploys
4. **Never duplicate state** across tiers — pick one canonical source per entity
5. **EventBus** (`core/store.ts`) is for in-process pub/sub only, NOT for state persistence

### Anti-patterns

- Storing workflow results in Redis (use Supabase `workflow_runs`)
- Reading JSON files for data that should be in Supabase
- Using `system_state` table as a general cache (use Redis or in-memory)
- Writing to both Redis and Supabase for the same entity

### Migration Path

- `state/*.json` files should be migrated to Supabase `system_state` table
- `core/store.ts` EventBus remains for in-process events only
- Any new state requirement → Supabase by default

---

## Consequences

- Clear decision path for new features
- Reduces state synchronization bugs
- JSON files become development-only convenience
