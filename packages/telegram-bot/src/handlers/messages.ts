/**
 * Message Handler
 * All queries go through BullMQ queues for execution
 */

import TelegramBot from 'node-telegram-bot-api';
import { isAllowed } from '../utils/auth';
import { sendLongMessage } from '../utils/telegram';
import { submitAgentJob, submitSkillJob, subscribeToJob, getJobStatus } from '../services/bullmq';
import { getSession, saveSession, isLocked, lock, unlock } from '../services/session';
import { getPendingAction, clearPendingAction } from './callbacks';
import { backToMainKeyboard } from '../keyboards/main';
import { TYPING_INTERVAL } from '../config';
import { createLogger } from '@elio/shared';
import { getDb } from '@elio/db';

const logger = createLogger('telegram-bot:messages');

const STREAM_UPDATE_INTERVAL = 2000;
const JOB_TIMEOUT = 600_000;

async function logMessage(msg: TelegramBot.Message, response?: string): Promise<void> {
  try {
    const db = getDb();
    const saved = await db.message.saveMessage(
      'telegram',
      String(msg.message_id),
      String(msg.from?.id || 'unknown'),
      msg.text || '',
      {
        chat_id: msg.chat.id,
        username: msg.from?.username,
        first_name: msg.from?.first_name,
        response_length: response?.length
      }
    );
    if (response) {
      await db.message.markProcessed(saved.id, 'claude_response');
    }
  } catch (err) {
    logger.warn('Failed to log message to DB', { error: String(err) });
  }
}

export function registerMessageHandler(bot: TelegramBot): void {

  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    if (msg.voice || msg.audio) return;

    const userId = msg.from?.id;
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!userId || !isAllowed(userId)) {
      logger.warn('Blocked user', { userId });
      return;
    }

    logger.info('Message received', { chatId, userId, text: text.substring(0, 50) });

    logMessage(msg).catch(() => {});

    const pending = getPendingAction(userId);
    if (pending) {
      clearPendingAction(userId);
      await handlePendingAction(bot, chatId, msg, pending, text);
      return;
    }

    if (isLocked(chatId)) {
      bot.sendMessage(chatId, 'Подожди, обрабатываю предыдущий запрос...');
      return;
    }

    lock(chatId);

    const statusMsg = await bot.sendMessage(chatId, '⏳');

    bot.sendChatAction(chatId, 'typing');
    const typingInterval = setInterval(() => {
      bot.sendChatAction(chatId, 'typing');
    }, TYPING_INTERVAL);

    try {
      const sessionId = getSession(chatId);
      const { workflowId } = await submitAgentJob(text, {
        sessionId: sessionId || undefined,
        chatId,
      });

      logger.info('Agent job submitted', { workflowId, chatId });

      let lastUpdateTime = 0;

      const unsubscribe = await subscribeToJob(
        workflowId,
        (partialText) => {
          const now = Date.now();
          if (now - lastUpdateTime >= STREAM_UPDATE_INTERVAL) {
            lastUpdateTime = now;
            const preview = partialText.slice(-200);
            bot.editMessageText(`⏳ ${preview}...`, {
              chat_id: chatId,
              message_id: statusMsg.message_id,
            }).catch(() => {});
          }
        },
        async (finalText) => {
          clearInterval(typingInterval);

          try {
            await bot.deleteMessage(chatId, statusMsg.message_id);
          } catch { /* ignore */ }

          if (finalText) {
            await sendLongMessage(bot, chatId, finalText);
            logMessage(msg, finalText).catch(() => {});
          } else {
            await bot.sendMessage(chatId, '❌ Нет ответа');
          }

          try {
            const state = await getJobStatus(workflowId);
            if (state.sessionId) {
              saveSession(chatId, state.sessionId);
            }
          } catch { /* ignore */ }

          unlock(chatId);
        },
        async (error) => {
          clearInterval(typingInterval);

          try {
            await bot.deleteMessage(chatId, statusMsg.message_id);
          } catch { /* ignore */ }

          logger.error('Agent job error', { workflowId, error });
          await bot.sendMessage(chatId, '❌ Ошибка: ' + error);
          unlock(chatId);
        }
      );

      setTimeout(() => {
        unsubscribe();
        if (isLocked(chatId)) {
          clearInterval(typingInterval);
          unlock(chatId);
        }
      }, JOB_TIMEOUT);

    } catch (err) {
      const error = err as Error;
      logger.error('Message handler error', { error: error.message });
      clearInterval(typingInterval);

      try {
        await bot.deleteMessage(chatId, statusMsg.message_id);
      } catch { /* ignore */ }

      await bot.sendMessage(chatId, '❌ Ошибка: ' + error.message);
      unlock(chatId);
    }
  });
}

async function handlePendingAction(
  bot: TelegramBot,
  chatId: number,
  msg: TelegramBot.Message,
  pending: { action: string; data?: string },
  input: string
): Promise<void> {
  bot.sendChatAction(chatId, 'typing');

  let skillName: string;
  let args: string[];

  switch (pending.action) {
    case 'research':
      skillName = 'deep-research';
      args = [input, pending.data || 'medium', 'markdown'];
      break;
    case 'youtube':
      skillName = 'youtube-transcript';
      args = [input, 'ru,en'];
      break;
    case 'person':
      skillName = 'person-research';
      args = [input];
      break;
    case 'websearch':
      skillName = 'web-search';
      args = [input, '10'];
      break;
    default:
      await bot.sendMessage(chatId, 'Unknown action');
      return;
  }

  await bot.sendMessage(chatId, `⏳ ${skillName}...`);

  try {
    const { workflowId } = await submitSkillJob(skillName, args);

    const unsubscribe = await subscribeToJob(
      workflowId,
      () => {},
      async (output) => {
        const formatted = formatSkillOutput(output);
        await bot.sendMessage(chatId, formatted, {
          parse_mode: 'Markdown',
          reply_markup: backToMainKeyboard,
          disable_web_page_preview: true
        });
      },
      async (error) => {
        await bot.sendMessage(chatId, `❌ Ошибка: ${error}`);
      }
    );

    setTimeout(() => unsubscribe(), 300_000);
  } catch (err) {
    await bot.sendMessage(chatId, `❌ Ошибка: ${(err as Error).message}`);
  }
}

function formatSkillOutput(output: string): string {
  try {
    const json = JSON.parse(output);
    if (json.error) return `⚠️ ${json.error}`;
    if (json.transcript) {
      const preview = json.transcript.substring(0, 500);
      return `📺 *${json.language || 'Transcript'}*\n\n${preview}...`;
    }
    if (json.results) {
      return json.results.map((r: { title: string; url: string; snippet?: string }, i: number) =>
        `${i + 1}. [${r.title}](${r.url})\n${r.snippet || ''}`
      ).join('\n\n');
    }
    return '```json\n' + JSON.stringify(json, null, 2).substring(0, 1000) + '\n```';
  } catch {
    return output.substring(0, 2000);
  }
}
