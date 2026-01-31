/**
 * Telegram Client - Type Definitions
 */

export interface TelegramMessage {
  message_id: number;
  date: number;
  text?: string;
  from?: { id: number; first_name: string; last_name?: string; username?: string };
  chat: { id: number; type: string; title?: string; username?: string };
}

export interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  description?: string;
}

export interface TelegramResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
}
