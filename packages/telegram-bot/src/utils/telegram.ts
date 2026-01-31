/**
 * Telegram utilities
 */

import TelegramBot from 'node-telegram-bot-api';
import { MAX_MESSAGE_LENGTH } from '../config';

export function splitMessage(text: string, maxLength = MAX_MESSAGE_LENGTH): string[] {
  if (text.length <= maxLength) return [text];
  return text.match(new RegExp(`.{1,${maxLength}}`, 'gs')) || [text];
}

export async function sendLongMessage(
  bot: TelegramBot,
  chatId: number,
  text: string
): Promise<void> {
  const chunks = splitMessage(text);
  for (const chunk of chunks) {
    await bot.sendMessage(chatId, chunk);
  }
}
