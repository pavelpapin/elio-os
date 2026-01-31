/**
 * Groq Chat API - Fast responses (~1-2 sec)
 * For simple questions, use Groq instead of Claude CLI
 */

import * as https from 'https';
import { createLogger } from '@elio/shared';

const logger = createLogger('telegram-bot:groq');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'llama-3.3-70b-versatile'; // Fast and good

export interface GroqResult {
  response: string;
  error: string | null;
  latencyMs: number;
}

export async function askGroq(prompt: string, systemPrompt?: string): Promise<GroqResult> {
  const startTime = Date.now();

  if (!GROQ_API_KEY) {
    return { response: '', error: 'No GROQ_API_KEY', latencyMs: 0 };
  }

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const body = JSON.stringify({
    model: MODEL,
    messages,
    max_tokens: 2048,
    temperature: 0.7
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 30000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const latencyMs = Date.now() - startTime;

        if (res.statusCode !== 200) {
          logger.error('Groq API error', { statusCode: res.statusCode, body: data.slice(0, 200) });
          resolve({ response: '', error: `Groq error: ${res.statusCode}`, latencyMs });
          return;
        }

        try {
          const json = JSON.parse(data);
          const response = json.choices?.[0]?.message?.content || '';
          logger.info('Groq done', { ms: latencyMs, chars: response.length });
          resolve({ response, error: null, latencyMs });
        } catch (e) {
          resolve({ response: '', error: 'Parse error', latencyMs });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ response: '', error: err.message, latencyMs: Date.now() - startTime });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ response: '', error: 'Timeout', latencyMs: Date.now() - startTime });
    });

    req.write(body);
    req.end();
  });
}

/**
 * Check if query is simple enough for Groq
 */
export function isSimpleQuery(text: string): boolean {
  const lowered = text.toLowerCase();

  // Complex queries that need Claude
  const complexPatterns = [
    /код|code|напиши|write|создай|create|файл|file/,
    /исправь|fix|debug|ошибк/,
    /проанализируй|analyze|review/,
    /поиск|search|найди|find/,
    /git|commit|push|pull/,
    /сервер|server|deploy|запусти/
  ];

  for (const pattern of complexPatterns) {
    if (pattern.test(lowered)) {
      return false;
    }
  }

  // Short questions are usually simple
  return text.length < 200;
}
