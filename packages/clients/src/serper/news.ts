/**
 * Serper News Search
 */

import type { SerperNewsResult } from './types.js';
import { getCacheKey, getFromCache, setCache, getCredentials, httpsPost } from './client.js';
import { createLogger } from '@elio/shared';

const logger = createLogger('clients:serper');

export async function searchNews(
  query: string,
  options: { num?: number; gl?: string; hl?: string } = {}
): Promise<{ results: SerperNewsResult[]; cached: boolean; query: string }> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error('Serper API not configured');
  }

  const num = options.num || 10;
  const cacheKey = getCacheKey(`${query}:${num}:${options.gl || ''}`, 'news');

  const cached = getFromCache<SerperNewsResult[]>(cacheKey);
  if (cached) {
    logger.debug('News cache HIT', { query: query.slice(0, 50) });
    return { results: cached, cached: true, query };
  }

  logger.debug('News cache MISS, calling API', { query: query.slice(0, 50) });

  const response = await httpsPost<{
    news?: Array<{
      title: string;
      link: string;
      snippet: string;
      date?: string;
      source?: string;
      imageUrl?: string;
    }>;
  }>('/news', {
    q: query,
    num,
    ...(options.gl && { gl: options.gl }),
    ...(options.hl && { hl: options.hl }),
  }, creds.api_key);

  const results: SerperNewsResult[] = (response.news || []).map(r => ({
    title: r.title,
    link: r.link,
    snippet: r.snippet,
    date: r.date,
    source: r.source,
    imageUrl: r.imageUrl,
  }));

  // Cache news for shorter time (6 hours)
  setCache(cacheKey, results, 6 * 60 * 60 * 1000);

  return { results, cached: false, query };
}
