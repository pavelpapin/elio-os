/**
 * Grok Chat API
 */

import { createLogger } from '@elio/shared';
import type { GrokMessage, GrokResponse, GrokModel } from './types.js';
import { getCredentials, getCacheKey, getFromCache, setCache, API_BASE } from './client.js';

const logger = createLogger('grok');

export interface ChatOptions {
  model?: GrokModel;
  temperature?: number;
  max_tokens?: number;
}

/**
 * Chat with Grok
 */
export async function chat(
  messages: GrokMessage[],
  options: ChatOptions = {}
): Promise<GrokResponse> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error('Grok API not configured. Add api_key to credentials');
  }

  const {
    model = 'grok-3',
    temperature = 0.7,
    max_tokens = 2048
  } = options;

  // Cache based on messages content
  const cacheKey = getCacheKey(JSON.stringify(messages), 'chat');
  const cached = getFromCache<GrokResponse>(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  logger.info(`Chat request with ${messages.length} messages`);

  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${creds.api_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Grok API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    model: string;
    usage?: GrokResponse['usage'];
  };

  const result: GrokResponse = {
    content: data.choices[0]?.message?.content || '',
    model: data.model,
    usage: data.usage,
    cached: false
  };

  setCache(cacheKey, result);
  return result;
}
