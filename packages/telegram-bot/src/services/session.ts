/**
 * Session Management Service
 */

import { createLogger } from '@elio/shared';

const logger = createLogger('telegram-bot:session');

const sessions = new Map<number, string>();
const locks = new Map<number, boolean>();

export function getSession(chatId: number): string | null {
  return sessions.get(chatId) || null;
}

export function saveSession(chatId: number, sessionId: string): void {
  sessions.set(chatId, sessionId);
  logger.debug('Saved session', { chatId, sessionId });
}

export function clearSession(chatId: number): void {
  sessions.delete(chatId);
}

export function isLocked(chatId: number): boolean {
  return locks.get(chatId) === true;
}

export function lock(chatId: number): void {
  locks.set(chatId, true);
}

export function unlock(chatId: number): void {
  locks.delete(chatId);
}
