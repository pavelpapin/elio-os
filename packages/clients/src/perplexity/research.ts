/**
 * Perplexity Research Function
 */

import { SearchResult, ResearchOptions, PerplexityModel } from './types.js';
import { buildPerplexityPrompt } from './prompts.js';
import { getCacheKey, getFromCache, setCache, CACHE_TTL } from './cache.js';
import { search } from './search.js';

export async function research(topic: string, options: ResearchOptions = {}): Promise<SearchResult> {
  const depth = options.depth || 'standard';
  const focus = options.focus || 'general';
  const cacheKey = getCacheKey(topic, `research:${depth}:${focus}`);

  // Check cache (skip for news focus)
  if (focus !== 'news') {
    const cached = getFromCache(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }
  }

  let model: PerplexityModel;
  let maxTokens: number;

  switch (depth) {
    case 'quick':
      model = 'sonar';
      maxTokens = 512;
      break;
    case 'deep':
      model = 'sonar-pro';
      maxTokens = 4096;
      break;
    default:
      model = 'sonar-pro';
      maxTokens = 2048;
  }

  // Build system prompt from registry
  const systemPrompt = buildPerplexityPrompt(depth, focus);

  const result = await search(topic, {
    model,
    systemPrompt,
    maxTokens,
    searchRecency: focus === 'news' ? 'week' : undefined
  });

  // Cache research results
  const ttl = focus === 'news' ? 6 * 60 * 60 * 1000 : CACHE_TTL;
  setCache(cacheKey, result, ttl);

  return result;
}
