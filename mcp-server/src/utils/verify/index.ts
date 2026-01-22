/**
 * Verification Module
 * Validates deliverables before marking tasks as complete
 */

import { fileLogger } from '../file-logger.js';
import { notifyTelegram } from '../progress.js';
import type { VerifyConfig, VerifyResult } from './types.js';
import { verifyNotionPage } from './verifiers/notion.js';
import { verifyFile } from './verifiers/file.js';
import { verifyEmail } from './verifiers/email.js';
import { verifyCalendarEvent } from './verifiers/calendar.js';

export type { VerifyConfig, VerifyResult, DeliverableType, Verifier } from './types.js';
export { VERIFY_PRESETS } from './presets.js';

/**
 * Main verify function with retry logic
 */
export async function verify(
  config: VerifyConfig,
  runId?: string
): Promise<VerifyResult> {
  const logger = fileLogger.forRun('verify', runId || 'default');
  const maxRetries = config.maxRetries ?? 3;
  const retryDelay = config.retryDelay ?? 2000;

  logger.info(`Starting verification: ${config.type}`, { config });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await executeVerification(config);

    if (result.ok) {
      logger.info(`Verification passed on attempt ${attempt}`, result.details);
      return result;
    }

    logger.warn(`Verification failed (attempt ${attempt}/${maxRetries}): ${result.error}`);

    if (attempt < maxRetries) {
      await notifyTelegram(`⚠️ Verification failed (${attempt}/${maxRetries}): ${result.error}\nRetrying...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    } else {
      logger.error(`Verification failed after ${maxRetries} attempts`, result);
      await notifyTelegram(`❌ Verification FAILED: ${result.error}`);
      return result;
    }
  }

  return { ok: false, error: 'Unexpected verification loop exit' };
}

async function executeVerification(config: VerifyConfig): Promise<VerifyResult> {
  switch (config.type) {
    case 'notion_page':
    case 'notion_database_entry':
      return verifyNotionPage(config);

    case 'file':
      return verifyFile(config);

    case 'email_sent':
      return verifyEmail(config);

    case 'calendar_event':
      return verifyCalendarEvent(config);

    default:
      return { ok: false, error: `Unknown deliverable type: ${config.type}` };
  }
}

/**
 * Wrap a task with automatic verification
 */
export async function withVerification<T extends { pageId?: string; path?: string }>(
  taskName: string,
  task: () => Promise<T>,
  verifyConfig: (result: T) => VerifyConfig,
  runId?: string
): Promise<{ result: T; verified: boolean; verifyResult: VerifyResult }> {
  const logger = fileLogger.forRun('verify', runId || 'default');

  logger.info(`Starting task with verification: ${taskName}`);

  const result = await task();
  const config = verifyConfig(result);
  const verifyResult = await verify(config, runId);

  if (!verifyResult.ok) {
    throw new Error(`Task ${taskName} failed verification: ${verifyResult.error}`);
  }

  logger.info(`Task ${taskName} completed and verified`);

  return { result, verified: true, verifyResult };
}
