/**
 * Voice Message Handler
 * Transcribes voice, then sends to BullMQ agent-execution queue
 */

import TelegramBot from 'node-telegram-bot-api';
import { isAllowed } from '../utils/auth';
import { sendLongMessage } from '../utils/telegram';
import { submitAgentJob, subscribeToJob, getJobStatus } from '../services/bullmq';
import { transcribeVoice } from '../services/voice';
import { getSession, saveSession, isLocked, lock, unlock } from '../services/session';
import { TYPING_INTERVAL } from '../config';
import { createLogger } from '@elio/shared';

const logger = createLogger('telegram-bot:voice-handler');

const JOB_TIMEOUT = 600_000;

export function registerVoiceHandler(bot: TelegramBot): void {

  bot.on('voice', async (msg) => {
    const userId = msg.from?.id;
    const chatId = msg.chat.id;
    const voice = msg.voice;

    if (!userId || !isAllowed(userId) || !voice) {
      return;
    }

    logger.info('Voice received', { chatId, duration: voice.duration });

    if (isLocked(chatId)) {
      bot.sendMessage(chatId, 'Подожди, обрабатываю предыдущий запрос...');
      return;
    }

    lock(chatId);

    bot.sendChatAction(chatId, 'typing');
    const typingInterval = setInterval(() => {
      bot.sendChatAction(chatId, 'typing');
    }, TYPING_INTERVAL);

    try {
      const text = await transcribeVoice(voice.file_id, voice.duration);

      if (!text || text.startsWith('Ошибка') || text.startsWith('Не удалось')) {
        await bot.sendMessage(chatId, text);
        return;
      }

      const shortText = text.length > 50 ? text.slice(0, 50) + '...' : text;
      logger.info('Transcribed', { text: shortText });

      const sessionId = getSession(chatId);
      const { workflowId } = await submitAgentJob(text, {
        sessionId: sessionId || undefined,
        chatId,
      });

      const unsubscribe = await subscribeToJob(
        workflowId,
        () => {},
        async (finalText) => {
          clearInterval(typingInterval);

          if (finalText) {
            await sendLongMessage(bot, chatId, finalText);
          } else {
            await bot.sendMessage(chatId, 'Нет ответа');
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
          logger.error('Voice agent job error', { workflowId, error });
          await bot.sendMessage(chatId, 'Ошибка: ' + error);
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
      logger.error('Voice handler error', { error: error.message });
      clearInterval(typingInterval);
      await bot.sendMessage(chatId, 'Ошибка: ' + error.message);
      unlock(chatId);
    }
  });
}
