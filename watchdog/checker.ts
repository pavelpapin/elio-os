#!/usr/bin/env npx tsx
/**
 * Watchdog Checker
 * Called by Make (Integromat) scenario via HTTP webhook
 *
 * Flow:
 * 1. Make cron triggers this endpoint every 5 min
 * 2. Checks Supabase for missed heartbeats
 * 3. If missed → attempts repair → sends Telegram alert
 * 4. Returns JSON status for Make to process
 *
 * Usage: npx tsx watchdog/checker.ts
 * Or: curl http://server:PORT/watchdog/check
 */

import { getDb } from '../mcp-server/src/db/index.js';
import { repair } from './repair.js';
import { loadConfig, type MonitorConfig } from './utils.js';

export interface CheckResult {
  ok: boolean;
  timestamp: string;
  missed: MissedTask[];
  repaired: RepairedTask[];
  errors: string[];
}

interface MissedTask {
  taskName: string;
  expectedAt: string;
  minutesOverdue: number;
}

interface RepairedTask {
  taskName: string;
  action: string;
  success: boolean;
  error?: string;
}

export async function checkAndRepair(): Promise<CheckResult> {
  const result: CheckResult = {
    ok: true,
    timestamp: new Date().toISOString(),
    missed: [],
    repaired: [],
    errors: [],
  };

  try {
    const config = loadConfig();
    const db = getDb();

    // 1. Check for missed heartbeats
    const missed = await db.watchdog.checkMissed(config.defaults.graceMinutes);

    if (missed.length === 0) {
      return result;
    }

    result.ok = false;
    result.missed = missed.map(m => ({
      taskName: m.task_name,
      expectedAt: m.expected_at,
      minutesOverdue: Math.round(m.minutes_overdue),
    }));

    // 2. Attempt repair for each missed task
    for (const m of missed) {
      const monitorConfig = config.monitors.find(mon => mon.name === m.task_name);

      try {
        const repairResult = await repair({
          heartbeatId: m.heartbeat_id,
          taskName: m.task_name,
          config: monitorConfig || config.defaults as unknown as MonitorConfig,
        });

        result.repaired.push({
          taskName: m.task_name,
          action: repairResult.action,
          success: repairResult.success,
          error: repairResult.error,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown repair error';
        result.errors.push(`${m.task_name}: ${errMsg}`);
      }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    result.ok = false;
    result.errors.push(errMsg);
  }

  return result;
}

/** Format result for Telegram notification */
export function formatTelegramAlert(result: CheckResult): string {
  if (result.ok) return '';

  const lines: string[] = ['🚨 <b>Watchdog Alert</b>\n'];

  if (result.missed.length > 0) {
    lines.push('❌ <b>Missed tasks:</b>');
    for (const m of result.missed) {
      lines.push(`  • ${m.taskName} (${m.minutesOverdue}min overdue)`);
    }
    lines.push('');
  }

  if (result.repaired.length > 0) {
    lines.push('🔧 <b>Repair attempts:</b>');
    for (const r of result.repaired) {
      const icon = r.success ? '✅' : '❌';
      lines.push(`  ${icon} ${r.taskName}: ${r.action}${r.error ? ` (${r.error})` : ''}`);
    }
    lines.push('');
  }

  if (result.errors.length > 0) {
    lines.push('⚠️ <b>Errors:</b>');
    for (const e of result.errors) {
      lines.push(`  • ${e}`);
    }
  }

  return lines.join('\n');
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  checkAndRepair()
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) {
        const alert = formatTelegramAlert(result);
        console.log('\nTelegram alert:\n', alert);
      }
      process.exit(result.ok ? 0 : 1);
    })
    .catch(err => {
      console.error('Watchdog checker failed:', err);
      process.exit(2);
    });
}
