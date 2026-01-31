/**
 * Voice Transcription Backends
 * Groq Whisper (fast) + Local Whisper (fallback)
 */

import { execFile } from 'child_process';
import * as fs from 'fs';
import * as https from 'https';
import { createLogger } from '@elio/shared';

const logger = createLogger('telegram-bot:voice');

const TEMP_DIR = '/tmp/elio-voice';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const SAFE_PATH_REGEX = /^[a-zA-Z0-9_\-./]+$/;

function validatePath(filePath: string): void {
  if (!filePath.startsWith(TEMP_DIR)) {
    throw new Error('Invalid file path: must be in temp directory');
  }
  if (!SAFE_PATH_REGEX.test(filePath)) {
    throw new Error('Invalid file path: contains unsafe characters');
  }
}

export function hasGroqKey(): boolean {
  return !!GROQ_API_KEY;
}

export async function transcribeWithGroq(audioPath: string): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('No GROQ_API_KEY');
  }

  validatePath(audioPath);

  const FormData = await import('form-data');
  const form = new FormData.default();
  form.append('file', fs.createReadStream(audioPath));
  form.append('model', 'whisper-large-v3');
  form.append('language', 'ru');
  form.append('response_format', 'text');

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${GROQ_API_KEY}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data.trim());
        } else {
          reject(new Error(`Groq API error: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    form.pipe(req);
  });
}

export async function transcribeWithLocalWhisper(audioPath: string, duration: number): Promise<string> {
  validatePath(audioPath);

  const wavPath = audioPath.replace('.ogg', '.wav');
  validatePath(wavPath);

  await new Promise<void>((resolve, reject) => {
    execFile('ffmpeg', ['-y', '-i', audioPath, '-ar', '16000', '-ac', '1', wavPath], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const timeout = Math.max(duration * 15000, 120000);
  logger.info('Local whisper', { duration, timeoutSec: timeout / 1000 });

  const result = await new Promise<string>((resolve, reject) => {
    execFile(
      'whisper',
      [wavPath, '--model', 'tiny', '--language', 'Russian', '--output_format', 'txt', '--output_dir', TEMP_DIR],
      { timeout },
      (err, stdout) => {
        if (err) {
          execFile(
            'python3',
            ['-c', `import whisper; m=whisper.load_model('tiny'); r=m.transcribe('''${wavPath.replace(/'/g, "\\'")}'''); print(r['text'])`],
            { timeout },
            (err2, stdout2) => {
              if (err2) reject(err);
              else resolve(stdout2.trim());
            }
          );
        } else {
          const txtPath = wavPath.replace('.wav', '.txt');
          if (fs.existsSync(txtPath)) {
            resolve(fs.readFileSync(txtPath, 'utf-8').trim());
          } else {
            resolve(stdout.trim());
          }
        }
      }
    );
  });

  try { fs.unlinkSync(wavPath); } catch {}
  try { fs.unlinkSync(wavPath.replace('.wav', '.txt')); } catch {}

  return result;
}
