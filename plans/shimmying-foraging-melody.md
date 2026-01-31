# Auto-Fix System for System Loop Alerts

## Problem
Alerts go to Telegram → user must manually investigate and fix. No auto-remediation.

## Solution
Insert an auto-fix layer between failure detection and user notification in the system loop.

```
executeItem() fails → classify → select strategy → attempt fix → fixed? done : notify user
```

## New Files (4)

### 1. `scripts/system-loop/autofix.ts`
Main entry: `attemptAutoFix(item, result)` — classifies failure, picks strategy, executes, tracks state.

### 2. `scripts/system-loop/autofix-classify.ts`
Pattern-matches error strings into classes:
- `transient` — timeout, ECONNREFUSED, 429/502/503 → retry with backoff
- `service-down` — redis/supabase connection errors → restart service + retry
- `script-error` — collector script crashes → launch diagnostic Claude agent
- `agent-timeout` — agent exceeded time → retry with extended timeout
- `unknown` → escalate to user immediately

### 3. `scripts/system-loop/autofix-strategies.ts`
One strategy per failure class:
- **retry-with-backoff**: re-submit via executor with `retries: 2, retryDelay: 10s`
- **restart-service**: `systemctl restart redis-server`, verify, then retry
- **diagnostic-agent**: launch Claude agent with error context to diagnose and fix
- **retry-shorter**: retry agent with extended timeout

### 4. `scripts/system-loop/autofix-state.ts`
Circuit breaker: max 3 fix attempts per item per 24h. State persisted to `/root/.claude/state/autofix-state.json`.

## Modified Files (2)

### `scripts/system-loop/index.ts` (lines ~128-198)
After `executeItem()` fails, call `attemptAutoFix()` before building failure notification:
```typescript
if (!result.success) {
  const { fixed } = await attemptAutoFix(item, result)
  if (fixed) { result.success = true; result.error = undefined }
}
```
Failure Telegram message includes what fix was attempted.

### `config/system.ts`
Add `autoFix` config block (enabled, maxAttempts, allowedServiceRestarts).

## Verification
1. Build: `pnpm build` from `/root/.claude`
2. Simulate failure: temporarily break `sync-backlog-to-notion.ts`, run system loop, verify it retries and reports
3. Check state file created at `/root/.claude/state/autofix-state.json`
4. Verify circuit breaker: after 3 failures, user gets Telegram alert with fix attempt details
