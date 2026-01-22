/**
 * Nightly Consilium - Report Generation
 * Creates reports in Notion and local files
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import type { createFileLogger } from '../../utils/file-logger.js';
import type { ConsiliumResult } from './types.js';

const CONSILIUM_LOGS_PATH = '/root/.claude/logs/consilium';

/**
 * Ensure logs directory exists
 */
function ensureLogsDir(): void {
  if (!existsSync(CONSILIUM_LOGS_PATH)) {
    mkdirSync(CONSILIUM_LOGS_PATH, { recursive: true });
  }
}

/**
 * Create Notion report (or save to file as fallback)
 */
export async function createNotionReport(
  result: ConsiliumResult,
  logger: ReturnType<typeof createFileLogger>
): Promise<string | null> {
  ensureLogsDir();

  const reportPath = `${CONSILIUM_LOGS_PATH}/${result.runId}.json`;
  writeFileSync(reportPath, JSON.stringify(result, null, 2));
  logger.info(`Consilium report saved to ${reportPath}`);

  return reportPath;
}

/**
 * Format summary for Telegram notification
 */
export function formatTelegramSummary(result: ConsiliumResult): string {
  const scoreLines = Object.entries(result.scoreChanges)
    .map(([cat, s]) => `• ${cat}: ${s.before}`)
    .join('\n');

  const priorityLines = result.consensus
    .slice(0, 3)
    .map((c, i) => `${i + 1}. ${c.action} (${c.votes}/3 votes)`)
    .join('\n');

  return `🌙 *Nightly Consilium Complete*

📊 Scores:
${scoreLines}

🔧 Auto-fixed: ${result.appliedFixes.length} issues

📋 Top priorities:
${priorityLines}

🆔 Run: ${result.runId}`;
}
