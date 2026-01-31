/**
 * Nightly Notification Logic
 */

import type { HealthCheckResult } from './nightly-health.js';

export interface NightlyReport {
  date: string;
  startedAt: string;
  completedAt: string;
  duration: number;
  issuesProcessed: number;
  issuesFixed: number;
  healthChecks: Record<string, HealthCheckResult>;
  autoFixes: Array<{
    taskId: string;
    issue: string;
    action: string;
    result: 'success' | 'failed' | 'skipped';
    details?: string;
  }>;
  pendingForMorning: string[];
  summary: {
    overallHealth: 'good' | 'degraded' | 'poor';
    criticalIssues: number;
    recommendations: string[];
  };
}

/**
 * Send Telegram notification
 */
export async function notifyTelegram(report: NightlyReport): Promise<void> {
  const healthEmoji = report.summary.overallHealth === 'good' ? '✅' :
                      report.summary.overallHealth === 'degraded' ? '⚠️' : '🔴';

  const sourceStatus = Object.entries(report.healthChecks)
    .map(([source, check]) => {
      const emoji = check.status === 'ok' ? '✅' :
                    check.status === 'degraded' ? '⚠️' : '❌';
      return `${emoji} ${source}`;
    })
    .join('\n');

  const pendingList = report.pendingForMorning.length > 0
    ? `\n\n⚠️ Needs attention:\n${report.pendingForMorning.map(p => `• ${p}`).join('\n')}`
    : '';

  const message = `🌙 Nightly Improvement Report (${report.date})

${healthEmoji} Overall: ${report.summary.overallHealth}
Issues: ${report.issuesProcessed} processed, ${report.issuesFixed} fixed
Duration: ${Math.round(report.duration / 1000)}s

Source Health:
${sourceStatus}${pendingList}

Full report: /logs/nightly/${report.date}.json`;

  try {
    // Use elio_telegram_notify
    // This would call the MCP tool - for now just log
    console.log('[Nightly] Would send Telegram notification:');
    console.log(message);
  } catch (error) {
    console.error('[Nightly] Failed to send notification:', error);
  }
}
