/**
 * Keyboard Types and Builders
 */

import TelegramBot from 'node-telegram-bot-api';

export type CallbackAction =
  | 'menu:main'
  | 'menu:skills'
  | 'menu:jobs'
  | 'menu:memory'
  | 'menu:settings'
  | 'skill:research'
  | 'skill:youtube'
  | 'skill:person'
  | 'skill:websearch'
  | 'job:list'
  | 'job:add'
  | 'job:toggle'
  | 'memory:facts'
  | 'memory:people'
  | 'session:new'
  | 'session:status'
  | 'cancel'
  | 'confirm';

export interface CallbackData {
  action: CallbackAction;
  data?: string;
}

export function encodeCallback(action: CallbackAction, data?: string): string {
  if (data) {
    return `${action}:${data}`;
  }
  return action;
}

export function decodeCallback(callbackData: string): CallbackData {
  const parts = callbackData.split(':');
  if (parts.length >= 3) {
    return {
      action: `${parts[0]}:${parts[1]}` as CallbackAction,
      data: parts.slice(2).join(':')
    };
  }
  return { action: callbackData as CallbackAction };
}

export type InlineKeyboard = TelegramBot.InlineKeyboardMarkup;

export function button(
  text: string,
  action: CallbackAction,
  data?: string
): TelegramBot.InlineKeyboardButton {
  return {
    text,
    callback_data: encodeCallback(action, data)
  };
}
