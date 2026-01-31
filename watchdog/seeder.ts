/**
 * Watchdog Seeder
 * Creates expected heartbeats for upcoming scheduled tasks
 * Called by Make daily, before nightly tasks are due
 */

import { getDb } from '../mcp-server/src/db/index.js';
import { loadConfig } from './utils.js';
import { parseExpression } from 'cron-parser';

export interface SeededHeartbeat {
  taskName: string;
  expectedAt: string;
}

/**
 * Create expected heartbeats for all monitored tasks
 * for the next 24 hours based on their cron schedules
 */
export async function seedExpectedHeartbeats(): Promise<SeededHeartbeat[]> {
  const config = loadConfig();
  const db = getDb();
  const seeded: SeededHeartbeat[] = [];

  for (const monitor of config.monitors) {
    try {
      const interval = parseExpression(monitor.cron, {
        tz: monitor.timezone || 'UTC',
      });

      // Get next occurrence
      const next = interval.next().toDate();

      // Only seed if within next 24 hours
      const hoursAway = (next.getTime() - Date.now()) / 3600_000;
      if (hoursAway > 24) continue;

      // Check if already seeded
      const existing = await db.watchdog.findBy(
        { task_name: monitor.name, status: 'expected' },
        { limit: 1, orderBy: 'expected_at' }
      );

      const alreadySeeded = existing.some(
        h => Math.abs(new Date(h.expected_at).getTime() - next.getTime()) < 300_000 // 5 min tolerance
      );

      if (alreadySeeded) continue;

      await db.watchdog.createExpected(monitor.name, next);

      seeded.push({
        taskName: monitor.name,
        expectedAt: next.toISOString(),
      });
    } catch (err) {
      console.error(`Failed to seed heartbeat for ${monitor.name}:`, err);
    }
  }

  return seeded;
}
