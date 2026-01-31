/**
 * Watchdog Repair Module
 * Attempts to fix missed/failed scheduled tasks
 */

import { Queue } from 'bullmq';
import { getDb } from '../mcp-server/src/db/index.js';
import { sendTelegram } from '../mcp-server/src/utils/progress/telegram.js';
import { loadConfig, type MonitorConfig } from './utils.js';

export interface RepairParams {
  heartbeatId: string;
  taskName: string;
  config: MonitorConfig;
}

export interface RepairResult {
  action: string;
  success: boolean;
  error?: string;
}

/**
 * Attempt to repair a missed task with escalating actions:
 * 1. retry - re-queue the task
 * 2. restart_worker - signal worker restart
 * 3. escalate - send detailed alert to Telegram
 */
export async function repair(params: RepairParams): Promise<RepairResult> {
  const { heartbeatId, taskName, config } = params;
  const db = getDb();

  // Check how many retries we've already done
  const repairs = await db.watchdog.getRepairs(taskName, 10);
  const recentRetries = repairs.filter(
    r => r.action === 'retry' &&
    Date.now() - new Date(r.created_at).getTime() < 3600_000 // last hour
  );
  const attempt = recentRetries.length + 1;

  if (attempt > config.maxRetries) {
    // Max retries exceeded → escalate
    return escalate(params, attempt, 'Max retries exceeded');
  }

  // Determine action based on attempt number
  const actionIndex = Math.min(attempt - 1, config.repairActions.length - 1);
  const action = config.repairActions[actionIndex] || 'retry';

  switch (action) {
    case 'retry':
      return retryTask(params, attempt);
    case 'restart_worker':
      return restartWorker(params, attempt);
    case 'escalate':
      return escalate(params, attempt, 'Scheduled escalation');
    default:
      return escalate(params, attempt, `Unknown action: ${action}`);
  }
}

/** Re-queue the task for immediate execution */
async function retryTask(params: RepairParams, attempt: number): Promise<RepairResult> {
  const { heartbeatId, taskName } = params;
  const db = getDb();

  try {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

    const queue = new Queue('agent-execution', {
      connection: { host: redisHost, port: redisPort },
    });

    await queue.add('agent-execution', {
      workflowId: `watchdog-retry-${taskName}-${Date.now()}`,
      params: {
        agentId: taskName,
        prompt: 'Continue your scheduled work (auto-retry by watchdog)',
        config: { repo: '/root/.claude' },
      },
    });

    await queue.close();

    // Log repair
    await db.watchdog.logRepair({
      heartbeatId,
      taskName,
      action: 'retry',
      attempt,
      result: 'success',
      diagnosis: { reason: 'missed_heartbeat', retryVia: 'agent-execution queue' },
    });

    // Notify
    await sendTelegram(
      `🔄 <b>Watchdog:</b> Retrying "${taskName}" (attempt ${attempt})`
    );

    return { action: 'retry', success: true };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';

    await db.watchdog.logRepair({
      heartbeatId,
      taskName,
      action: 'retry',
      attempt,
      result: 'failed',
      error: errMsg,
    });

    return { action: 'retry', success: false, error: errMsg };
  }
}

/** Attempt to restart the worker process */
async function restartWorker(params: RepairParams, attempt: number): Promise<RepairResult> {
  const { heartbeatId, taskName } = params;
  const db = getDb();

  try {
    // Check if Redis is reachable (common failure cause)
    const healthy = await db.healthCheck();

    const diagnosis: Record<string, unknown> = {
      reason: 'missed_after_retry',
      dbHealthy: healthy,
    };

    // Log repair attempt
    await db.watchdog.logRepair({
      heartbeatId,
      taskName,
      action: 'restart_worker',
      attempt,
      result: 'pending',
      diagnosis,
    });

    // Notify with diagnosis
    await sendTelegram(
      `⚠️ <b>Watchdog:</b> Worker restart needed for "${taskName}"\n` +
      `DB healthy: ${healthy}\n` +
      `Attempt: ${attempt}`
    );

    // Try retry as fallback (restart requires external process manager)
    return retryTask(params, attempt);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    return { action: 'restart_worker', success: false, error: errMsg };
  }
}

/** Escalate to human via Telegram with full diagnosis */
async function escalate(
  params: RepairParams,
  attempt: number,
  reason: string
): Promise<RepairResult> {
  const { heartbeatId, taskName } = params;
  const db = getDb();

  try {
    // Gather diagnosis
    const repairs = await db.watchdog.getRepairs(taskName, 10);
    const status = await db.watchdog.getStatus(24);
    const taskHistory = status.filter(s => s.task_name === taskName);

    const diagnosis = {
      reason,
      totalAttempts: attempt,
      recentRepairs: repairs.slice(0, 5).map(r => ({
        action: r.action,
        result: r.result,
        at: r.created_at,
        error: r.error,
      })),
      lastSuccessful: taskHistory.find(h => h.status === 'completed')?.completed_at || 'never',
    };

    await db.watchdog.logRepair({
      heartbeatId,
      taskName,
      action: 'escalate',
      attempt,
      result: 'success',
      diagnosis,
    });

    // Detailed Telegram alert
    const lastSuccess = diagnosis.lastSuccessful === 'never'
      ? 'никогда'
      : new Date(diagnosis.lastSuccessful).toLocaleString('ru-RU', { timeZone: 'Asia/Tbilisi' });

    await sendTelegram(
      `🚨 <b>ESCALATION: ${taskName}</b>\n\n` +
      `Причина: ${reason}\n` +
      `Попыток починки: ${attempt}\n` +
      `Последний успех: ${lastSuccess}\n\n` +
      `Последние repair:\n` +
      diagnosis.recentRepairs.map(r =>
        `  ${r.result === 'success' ? '✅' : '❌'} ${r.action} @ ${new Date(r.at).toLocaleTimeString()}`
      ).join('\n') +
      `\n\n⚡ Требуется ручное вмешательство`
    );

    return { action: 'escalate', success: true };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    return { action: 'escalate', success: false, error: errMsg };
  }
}
