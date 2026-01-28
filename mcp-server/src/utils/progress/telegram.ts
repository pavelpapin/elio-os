/**
 * Telegram Notifications
 */

import { fileLogger } from '../file-logger.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegram(message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    fileLogger.warn('progress', 'Telegram not configured');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      fileLogger.error('progress', `Telegram send failed: ${await response.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    fileLogger.error('progress', `Telegram error: ${error}`);
    return false;
  }
}

export { sendTelegram as notifyTelegram };
