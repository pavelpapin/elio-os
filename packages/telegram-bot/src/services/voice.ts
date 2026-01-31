/**
 * Voice Message Service
 * Primary: Groq Whisper API (fast, ~1-2 sec)
 * Fallback: Local whisper (slow, CPU only)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { BOT_TOKEN } from '../config';
import { createLogger } from '@elio/shared';
import { transcribeWithGroq, transcribeWithLocalWhisper, hasGroqKey } from './voice-transcribe.js';

const logger = createLogger('telegram-bot:voice');

const TEMP_DIR = '/tmp/elio-voice';

function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true, mode: 0o700 });
  }
}

async function downloadFile(fileId: string): Promise<string> {
  ensureTempDir();

  // Validate fileId (Telegram file IDs are alphanumeric with some special chars)
  if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    throw new Error('Invalid file ID');
  }

  const fileInfoUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`;

  const fileInfo = await new Promise<{ result: { file_path: string } }>((resolve, reject) => {
    https.get(fileInfoUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Invalid response from Telegram'));
        }
      });
      res.on('error', reject);
    });
  });

  const filePath = fileInfo.result.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
  const localPath = path.join(TEMP_DIR, `${fileId}.ogg`);

  await new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(localPath, { mode: 0o600 });
    https.get(downloadUrl, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });

  return localPath;
}

export async function transcribeVoice(fileId: string, duration?: number): Promise<string> {
  const startTime = Date.now();
  const audioDuration = duration || 10;

  try {
    const audioPath = await downloadFile(fileId);
    const downloadTime = Date.now() - startTime;
    logger.info('Voice download', { ms: downloadTime });

    let text: string;

    // Try Groq first (fast), fallback to local whisper (slow)
    if (hasGroqKey()) {
      try {
        const groqStart = Date.now();
        text = await transcribeWithGroq(audioPath);
        logger.info('Groq transcribe', { ms: Date.now() - groqStart });
      } catch (groqErr) {
        logger.warn('Groq failed, using local whisper', { error: (groqErr as Error).message });
        text = await transcribeWithLocalWhisper(audioPath, audioDuration);
      }
    } else {
      logger.warn('No GROQ_API_KEY, using local whisper');
      text = await transcribeWithLocalWhisper(audioPath, audioDuration);
    }

    // Cleanup
    try { fs.unlinkSync(audioPath); } catch {}

    logger.info('Transcription complete', { ms: Date.now() - startTime });
    return text || 'Не удалось распознать речь';

  } catch (error) {
    logger.error('Voice error', { error: (error as Error).message });
    return 'Ошибка: ' + (error as Error).message;
  }
}
