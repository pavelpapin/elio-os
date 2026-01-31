/**
 * Perplexity API utility functions
 */

import { search } from './api.js';
import { getCacheKey, getFromCache, setCache, getCacheInstance } from './cache.js';
import {
  CACHE_TTL,
  FACT_CHECK_TTL,
  type FactCheckResult
} from './perplexity-types.js';

export async function factCheck(claim: string): Promise<FactCheckResult> {
  const cacheKey = getCacheKey(claim, 'factcheck');

  // Fact checks can be cached longer
  const cachedEntry = getCacheInstance().get(cacheKey);
  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    console.log(`[Perplexity] Fact check cache HIT`);
    const cached = cachedEntry.data;
    return {
      verdict: (cached as unknown as FactCheckResult).verdict || 'unverifiable',
      explanation: cached.answer,
      citations: cached.citations,
      cached: true
    };
  }

  const result = await search(
    `Fact check the following claim and provide a verdict (true, false, partially true, or unverifiable): "${claim}"`,
    {
      model: 'sonar-reasoning',
      systemPrompt: 'You are a fact-checker. Analyze claims objectively using reliable sources.',
      temperature: 0.1
    }
  );

  let verdict: FactCheckResult['verdict'] = 'unverifiable';
  const lowerAnswer = result.answer.toLowerCase();

  if (lowerAnswer.includes('verdict: true') || lowerAnswer.includes('is true')) {
    verdict = 'true';
  } else if (lowerAnswer.includes('verdict: false') || lowerAnswer.includes('is false')) {
    verdict = 'false';
  } else if (lowerAnswer.includes('partially true') || lowerAnswer.includes('partly true')) {
    verdict = 'partially_true';
  }

  const factResult: FactCheckResult = { verdict, explanation: result.answer, citations: result.citations };

  // Cache fact checks for 7 days
  getCacheInstance().set(cacheKey, {
    data: { ...result, verdict } as unknown as import('./perplexity-types.js').SearchResult,
    expiresAt: Date.now() + FACT_CHECK_TTL
  });

  return factResult;
}

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
      systemPrompt: `Provide a concise summary in ${maxLength} words or less.`,
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
    systemPrompt: 'Create a structured comparison with clear pros/cons for each option.',
    maxTokens: 2048
  });

  setCache(cacheKey, result, CACHE_TTL);

  return { comparison: result.answer, citations: result.citations };
}
