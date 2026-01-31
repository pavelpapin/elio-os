/**
 * Perplexity Search Function
 */

import { createLogger } from '@elio/shared';
import { perplexityRequest } from './client.js';
import { SearchResult, SearchOptions } from './types.js';
import { getCacheKey, getFromCache, setCache, CACHE_TTL } from './cache.js';

const logger = createLogger('perplexity');

export async function search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
  const model = options.model || 'sonar';
  const cacheKey = getCacheKey(query, model, options.systemPrompt);

  // Check cache first (skip for very fresh data needs)
  if (options.searchRecency !== 'day') {
    const cached = getFromCache(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }
  }

  logger.info('API call', { model, query: query.slice(0, 50) });

  const messages = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: query });

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: options.maxTokens || 1024,
    temperature: options.temperature || 0.2,
    return_citations: true
  };

  if (options.searchRecency) {
    body.search_recency_filter = options.searchRecency;
  }

  const response = await perplexityRequest(body);

  const result: SearchResult = {
    answer: response.choices[0]?.message?.content || '',
    citations: response.citations || [],
    model: response.model,
    tokensUsed: response.usage.total_tokens
  };

  // Cache result (shorter TTL for fresh data)
  const ttl = options.searchRecency === 'week' ? 6 * 60 * 60 * 1000 : CACHE_TTL; // 6h for news
  setCache(cacheKey, result, ttl);

  return result;
}
