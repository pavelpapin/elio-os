/**
 * Bot Lock Manager
 * Handles process locking, conflict resolution, and cleanup
 */

import * as fs from 'fs';
import * as https from 'https';
import * as os from 'os';
import { createLogger } from '@elio/shared';

const logger = createLogger('telegram-bot:lock-manager');

const LOCK_FILE = '/tmp/elio-bot.lock';
const PID_FILE = '/tmp/elio-bot.pid';
const HEALTH_FILE = '/tmp/elio-bot.health';

export { LOCK_FILE, PID_FILE, HEALTH_FILE };

interface LockInfo {
  pid: number;
  startedAt: string;
  hostname: string;
}

/**
 * Kill any process holding the Telegram polling
 */
async function killConflictingProcesses(botToken: string): Promise<void> {
  if (fs.existsSync(LOCK_FILE)) {
    try {
      const lockInfo: LockInfo = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));

      try {
        process.kill(lockInfo.pid, 0);

        logger.info('Killing stale bot process', { pid: lockInfo.pid });
        process.kill(lockInfo.pid, 'SIGTERM');

        await new Promise(r => setTimeout(r, 2000));

        try {
          process.kill(lockInfo.pid, 0);
          logger.warn('Force killing process', { pid: lockInfo.pid });
          process.kill(lockInfo.pid, 'SIGKILL');
        } catch {
          // Process is gone, good
        }
      } catch {
        logger.info('Removing stale lock file');
      }
    } catch {
      logger.warn('Removing invalid lock file');
    }

    fs.unlinkSync(LOCK_FILE);
  }

  try {
    const { execSync } = await import('child_process');
    execSync('pkill -f "elio_simple.js" 2>/dev/null || true', { stdio: 'ignore' });
  } catch {
    // Ignore errors
  }

  await clearPendingUpdates(botToken);
}

/**
 * Clear pending updates to avoid conflicts
 */
async function clearPendingUpdates(botToken: string): Promise<void> {
  return new Promise((resolve) => {
    const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=-1&timeout=1`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.ok && result.result.length > 0) {
            const lastId = result.result[result.result.length - 1].update_id;
            const confirmUrl = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${lastId + 1}&timeout=1`;
            https.get(confirmUrl, () => resolve()).on('error', () => resolve());
          } else {
            resolve();
          }
        } catch {
          resolve();
        }
      });
    }).on('error', () => resolve());
  });
}

/**
 * Acquire exclusive lock for this bot instance
 */
export function acquireLock(): boolean {
  const lockInfo: LockInfo = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
    hostname: os.hostname()
  };

  try {
    fs.writeFileSync(LOCK_FILE, JSON.stringify(lockInfo, null, 2), { flag: 'wx' });
    fs.writeFileSync(PID_FILE, process.pid.toString());

    const cleanup = () => {
      try {
        if (fs.existsSync(LOCK_FILE)) {
          const current = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));
          if (current.pid === process.pid) {
            fs.unlinkSync(LOCK_FILE);
          }
        }
        if (fs.existsSync(PID_FILE)) {
          fs.unlinkSync(PID_FILE);
        }
        if (fs.existsSync(HEALTH_FILE)) {
          fs.unlinkSync(HEALTH_FILE);
        }
      } catch { /* ignore */ }
    };

    process.on('exit', cleanup);
    process.on('SIGINT', () => { cleanup(); process.exit(0); });
    process.on('SIGTERM', () => { cleanup(); process.exit(0); });

    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
      return false;
    }
    throw err;
  }
}

/**
 * Force acquire lock (kill existing process if needed)
 */
export async function forceAcquireLock(botToken: string): Promise<void> {
  logger.info('Ensuring exclusive bot access');

  await killConflictingProcesses(botToken);
  await new Promise(r => setTimeout(r, 1000));

  if (!acquireLock()) {
    await killConflictingProcesses(botToken);
    await new Promise(r => setTimeout(r, 1000));

    if (!acquireLock()) {
      try { fs.unlinkSync(LOCK_FILE); } catch { /* ignore */ }
      if (!acquireLock()) {
        throw new Error('Failed to acquire bot lock after multiple attempts');
      }
    }
  }

  logger.info('Lock acquired', { pid: process.pid });
}

/**
 * Handle 409 Conflict error - attempt recovery
 */
export async function handleConflict(botToken: string): Promise<boolean> {
  logger.warn('Handling 409 Conflict');
  await killConflictingProcesses(botToken);
  return true;
}
