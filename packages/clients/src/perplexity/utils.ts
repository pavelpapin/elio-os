/**
 * Perplexity Utility Functions
 */

import { researchPrompts } from './prompts.js';
import { getCacheKey, getFromCache, setCache, CACHE_TTL } from './cache.js';
import { search } from './search.js';

export async function summarize(
  url: string,
  options: { maxLength?: number } = {}
): Promise<{ summary: string; citations: string[]; cached?: boolean }> {
  const maxLength = options.maxLength || 500;
  const cacheKey = getCacheKey(url, 'summarize', String(maxLength));

  const cached = getFromCache(cacheKey);
  if (cached) {
    return { summary: cached.answer, citations: cached.citations, cached: true };
  }

  const result = await search(
    `Summarize the main points from this article/page: ${url}`,
    {
      model: 'sonar',
      systemPrompt: researchPrompts.summarize.system(maxLength),
      maxTokens: 1024
    }
  );

  setCache(cacheKey, result, CACHE_TTL);

  return { summary: result.answer, citations: result.citations };
}

export async function compare(
  items: string[],
  criteria?: string[]
): Promise<{ comparison: string; citations: string[]; cached?: boolean }> {
  const cacheKey = getCacheKey(items.join('|'), 'compare', criteria?.join('|'));

  const cached = getFromCache(cacheKey);
  if (cached) {
    return { comparison: cached.answer, citations: cached.citations, cached: true };
  }

  let query = `Compare and contrast: ${items.join(' vs ')}`;
  if (criteria?.length) {
    query += `. Focus on these criteria: ${criteria.join(', ')}`;
  }

  const result = await search(query, {
    model: 'sonar-pro',
    systemPrompt: researchPrompts.compare.system,
    maxTokens: 2048
  });

  setCache(cacheKey, result, CACHE_TTL);

  return { comparison: result.answer, citations: result.citations };
}
