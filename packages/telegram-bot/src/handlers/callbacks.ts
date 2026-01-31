/**
 * Callback Query Handler
 * Handles inline keyboard button presses
 */

import TelegramBot from 'node-telegram-bot-api';
import { isAllowed } from '../utils/auth';
import { decodeCallback } from '../types/keyboards';
import {
  mainMenuKeyboard,
  skillsMenuKeyboard,
  jobsMenuKeyboard,
  memoryMenuKeyboard,
  settingsMenuKeyboard,
  backToMainKeyboard
} from '../keyboards/main';
import { buildResearchDepthKeyboard } from '../keyboards/dynamic';
import { clearSession, getSession } from '../services/session';
import { runSkill } from '../services/skills';
import { createLogger } from '@elio/shared';

const logger = createLogger('telegram-bot:callbacks');

// Store pending actions per user
const pendingActions = new Map<number, { action: string; data?: string }>();

export function registerCallbackHandler(bot: TelegramBot): void {
  bot.on('callback_query', async (query) => {
    const userId = query.from.id;
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;

    if (!chatId || !messageId) return;
    if (!isAllowed(userId)) {
      await bot.answerCallbackQuery(query.id, { text: 'Access denied' });
      return;
    }

    const { action, data } = decodeCallback(query.data || '');
    logger.info('Callback', { action, data });

    try {
      await handleAction(bot, chatId, messageId, userId, action, data, query.id);
    } catch (error) {
      logger.error('Callback error', { error });
      await bot.answerCallbackQuery(query.id, { text: 'Error' });
    }
  });
}

async function handleAction(
  bot: TelegramBot,
  chatId: number,
  messageId: number,
  userId: number,
  action: string,
  data: string | undefined,
  queryId: string
): Promise<void> {
  await bot.answerCallbackQuery(queryId);

  switch (action) {
    case 'menu:main':
      await editMenu(bot, chatId, messageId, '🤖 *Elio Menu*', mainMenuKeyboard);
      break;

    case 'menu:skills':
      await editMenu(bot, chatId, messageId, '🔬 *Skills*\n\nВыбери навык:', skillsMenuKeyboard);
      break;

    case 'menu:jobs':
      await editMenu(bot, chatId, messageId, '⏰ *Scheduled Jobs*', jobsMenuKeyboard);
      break;

    case 'menu:memory':
      await editMenu(bot, chatId, messageId, '🧠 *Memory*', memoryMenuKeyboard);
      break;

    case 'menu:settings':
      await editMenu(bot, chatId, messageId, '⚙️ *Settings*', settingsMenuKeyboard);
      break;

    case 'skill:research':
      await handleResearch(bot, chatId, messageId, userId, data);
      break;

    case 'skill:youtube':
      await promptForInput(bot, chatId, userId, 'youtube', 'Отправь ссылку на YouTube видео:');
      break;

    case 'skill:person':
      await promptForInput(bot, chatId, userId, 'person', 'Введи имя человека для поиска:');
      break;

    case 'skill:websearch':
      await promptForInput(bot, chatId, userId, 'websearch', 'Введи поисковый запрос:');
      break;

    case 'session:new':
      clearSession(chatId);
      await editMenu(bot, chatId, messageId, '✅ Новая сессия создана', mainMenuKeyboard);
      break;

    case 'session:status':
      const sessionId = getSession(chatId);
      const status = sessionId ? `Active: ${sessionId.substring(0, 8)}...` : 'No active session';
      await editMenu(bot, chatId, messageId, `📊 *Status*\n\n${status}`, backToMainKeyboard);
      break;

    case 'cancel':
      pendingActions.delete(userId);
      await editMenu(bot, chatId, messageId, '❌ Отменено', mainMenuKeyboard);
      break;
  }
}

async function editMenu(
  bot: TelegramBot,
  chatId: number,
  messageId: number,
  text: string,
  keyboard: TelegramBot.InlineKeyboardMarkup
): Promise<void> {
  await bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

async function handleResearch(
  bot: TelegramBot,
  chatId: number,
  messageId: number,
  userId: number,
  depth?: string
): Promise<void> {
  if (!depth) {
    await editMenu(
      bot, chatId, messageId,
      '🔬 *Deep Research*\n\nВыбери глубину:',
      buildResearchDepthKeyboard()
    );
    return;
  }

  pendingActions.set(userId, { action: 'research', data: depth });
  await bot.sendMessage(chatId, `Введи тему для исследования (глубина: ${depth}):`);
}

async function promptForInput(
  bot: TelegramBot,
  chatId: number,
  userId: number,
  action: string,
  prompt: string
): Promise<void> {
  pendingActions.set(userId, { action });
  await bot.sendMessage(chatId, prompt);
}

export function getPendingAction(userId: number) {
  return pendingActions.get(userId);
}

export function clearPendingAction(userId: number) {
  pendingActions.delete(userId);
}
