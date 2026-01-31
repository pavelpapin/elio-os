/**
 * Elio Bot - Entry Point
 * AI Operating System with Claude as brain
 *
 * Features:
 * - Singleton lock (only one instance can run)
 * - Auto-recovery from 409 conflicts
 * - Health monitoring
 * - Graceful shutdown
 */

import TelegramBot from 'node-telegram-bot-api';
import { createLogger } from '@elio/shared';
import { BOT_TOKEN, WHITELIST_ENABLED, WHITELIST } from './config';
import { registerCommands } from './handlers/commands';
import { registerMessageHandler } from './handlers/messages';
import { registerVoiceHandler } from './handlers/voice';
import { registerCallbackHandler } from './handlers/callbacks';
import { closeBullMQ } from './services/bullmq';
import {
  forceAcquireLock,
  recordPollSuccess,
  recordPollError,
  recordMessageProcessed,
  handleConflict,
  getHealthStatus
} from './services/guardian';

const logger = createLogger('telegram-bot');

let bot: TelegramBot | null = null;
let isShuttingDown = false;
let conflictRecoveryAttempts = 0;
const MAX_CONFLICT_RECOVERIES = 3;

async function startBot(): Promise<void> {
  // Acquire exclusive lock (kills any conflicting processes)
  await forceAcquireLock(BOT_TOKEN);

  // Create bot with polling
  bot = new TelegramBot(BOT_TOKEN, {
    polling: {
      autoStart: true,
      params: {
        timeout: 30
      }
    }
  });

  // Register handlers
  registerCommands(bot);
  registerCallbackHandler(bot);
  registerMessageHandler(bot);
  registerVoiceHandler(bot);

  // Track successful polls
  bot.on('message', () => {
    recordPollSuccess();
    recordMessageProcessed();
    conflictRecoveryAttempts = 0; // Reset on success
  });

  bot.on('callback_query', () => {
    recordPollSuccess();
    recordMessageProcessed();
    conflictRecoveryAttempts = 0;
  });

  // Handle polling errors
  bot.on('polling_error', async (err) => {
    const errorMessage = err.message || String(err);
    logger.error('Poll error', { error: errorMessage });

    recordPollError();

    // Handle 409 Conflict specifically
    if (errorMessage.includes('409') || errorMessage.includes('Conflict')) {
      conflictRecoveryAttempts++;

      if (conflictRecoveryAttempts <= MAX_CONFLICT_RECOVERIES) {
        logger.warn('Conflict recovery attempt', {
          attempt: conflictRecoveryAttempts,
          max: MAX_CONFLICT_RECOVERIES
        });

        try {
          // Stop current polling
          await bot?.stopPolling();

          // Handle conflict (kill other processes)
          await handleConflict(BOT_TOKEN);

          // Wait before restarting
          await new Promise(r => setTimeout(r, 3000));

          // Restart polling
          await bot?.startPolling();
          logger.info('Polling restarted after conflict recovery');
        } catch (recoveryErr) {
          logger.error('Recovery failed', { error: (recoveryErr as Error).message });
        }
      } else {
        logger.error('Max conflict recoveries exceeded, restarting bot');
        await restartBot();
      }
    }
  });

  // Log successful start
  logger.info('Bot started', {
    pid: process.pid,
    whitelistEnabled: WHITELIST_ENABLED,
    allowedUsers: WHITELIST_ENABLED ? WHITELIST : undefined
  });

  // Start health check interval
  setInterval(() => {
    const health = getHealthStatus();
    if (health.status !== 'healthy') {
      logger.warn('Unhealthy', { status: health.status, errors: health.pollErrors });
    }
  }, 60000); // Check every minute
}

async function restartBot(): Promise<void> {
  if (isShuttingDown) return;

  logger.info('Restarting bot');
  conflictRecoveryAttempts = 0;

  try {
    if (bot) {
      await bot.stopPolling();
      bot = null;
    }

    // Wait before restart
    await new Promise(r => setTimeout(r, 5000));

    // Start fresh
    await startBot();
  } catch (err) {
    logger.error('Restart failed', { error: (err as Error).message });
    // Exit and let systemd restart us
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info('Shutting down', { signal });

  try {
    if (bot) {
      await bot.stopPolling();
    }
    await closeBullMQ();
  } catch { /* ignore */ }

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message });
  // Don't exit, let the bot recover
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  // Don't exit, let the bot recover
});

// Start the bot
startBot().catch((err) => {
  logger.error('Failed to start bot', { error: err.message });
  process.exit(1);
})
