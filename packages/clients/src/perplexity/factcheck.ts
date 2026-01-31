/**
 * Perplexity Fact Check Function
 */

import { createLogger } from '@elio/shared';
import { SearchResult, FactCheckResult } from './types.js';
import { researchPrompts } from './prompts.js';
import { getCacheKey, getRawCache, FACT_CHECK_TTL } from './cache.js';
import { search } from './search.js';

const logger = createLogger('perplexity');

export async function factCheck(claim: string): Promise<FactCheckResult> {
  const cacheKey = getCacheKey(claim, 'factcheck');
  const cache = getRawCache();

  // Fact checks can be cached longer
  const cachedEntry = cache.get(cacheKey);
  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    logger.debug('Fact check cache HIT');
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
      systemPrompt: researchPrompts.factCheck.system,
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
  cache.set(cacheKey, {
    data: { ...result, verdict } as unknown as SearchResult,
    expiresAt: Date.now() + FACT_CHECK_TTL
  });

  return factResult;
}
