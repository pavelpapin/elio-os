/**
 * Command Handlers
 */

import TelegramBot from 'node-telegram-bot-api';
import { isAllowed } from '../utils/auth';
import { clearSession } from '../services/session';
import { mainMenuKeyboard, skillsMenuKeyboard } from '../keyboards/main';
import { getQueueStatus, getTask } from '../services/taskQueue';
import { createLogger } from '@elio/shared';

const logger = createLogger('telegram-bot:commands');

export function registerCommands(bot: TelegramBot): void {

  bot.onText(/\/start/, (msg) => {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;
    const username = msg.from?.username || msg.from?.first_name || 'unknown';

    logger.info('Start command', { userId, username });

    if (!userId || !isAllowed(userId)) {
      bot.sendMessage(chatId, `Доступ ограничен.\nТвой ID: ${userId}`);
      return;
    }

    bot.sendMessage(chatId,
      '🤖 *Elio*\n\n' +
      '• Пиши или голосовое\n' +
      '• /status - статус задач\n' +
      '• /new - новая сессия',
      { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard }
    );
  });

  // Task status command
  bot.onText(/\/status/, (msg) => {
    if (!msg.from?.id || !isAllowed(msg.from.id)) return;

    const status = getQueueStatus();

    if (!status.running && status.queued === 0) {
      bot.sendMessage(msg.chat.id, '✅ Нет активных задач');
      return;
    }

    let text = '';

    if (status.running) {
      const elapsed = Math.floor((Date.now() - new Date(status.running.startedAt!).getTime()) / 1000);
      text += `🔄 *Выполняется* (${elapsed}s)\n`;
      text += `\`${status.running.input.slice(0, 50)}...\`\n\n`;
    }

    if (status.queued > 0) {
      text += `📋 В очереди: ${status.queued}`;
    }

    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
  });

  // Task details by ID
  bot.onText(/\/task (.+)/, (msg, match) => {
    if (!msg.from?.id || !isAllowed(msg.from.id)) return;

    const taskId = match?.[1];
    if (!taskId) return;

    const task = getTask(taskId);
    if (!task) {
      bot.sendMessage(msg.chat.id, 'Задача не найдена');
      return;
    }

    let text = `*Задача ${task.id.slice(-6)}*\n`;
    text += `Статус: ${task.status}\n`;
    text += `Создана: ${task.createdAt}\n`;
    if (task.startedAt) text += `Начата: ${task.startedAt}\n`;
    if (task.completedAt) text += `Завершена: ${task.completedAt}\n`;
    if (task.error) text += `Ошибка: ${task.error}\n`;

    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/menu/, (msg) => {
    if (!msg.from?.id || !isAllowed(msg.from.id)) return;
    bot.sendMessage(msg.chat.id, '🤖 *Elio Menu*', {
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard
    });
  });

  bot.onText(/\/skills/, (msg) => {
    if (!msg.from?.id || !isAllowed(msg.from.id)) return;
    bot.sendMessage(msg.chat.id, '🔬 *Skills*\n\nВыбери навык:', {
      parse_mode: 'Markdown',
      reply_markup: skillsMenuKeyboard
    });
  });

  bot.onText(/\/new/, (msg) => {
    if (!msg.from?.id || !isAllowed(msg.from.id)) return;
    clearSession(msg.chat.id);
    bot.sendMessage(msg.chat.id, '✅ Новая сессия создана', {
      reply_markup: mainMenuKeyboard
    });
  });

  bot.onText(/\/id/, (msg) => {
    bot.sendMessage(msg.chat.id,
      `User ID: \`${msg.from?.id}\`\nChat ID: \`${msg.chat.id}\``,
      { parse_mode: 'Markdown' }
    );
  });
}
