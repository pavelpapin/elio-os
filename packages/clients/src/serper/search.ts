/**
 * Serper Web Search
 */

import type { SerperSearchResult, SerperSearchResponse } from './types.js';
import { getCacheKey, getFromCache, setCache, getCredentials, httpsPost } from './client.js';
import { createLogger } from '@elio/shared';

const logger = createLogger('clients:serper');

export async function search(
  query: string,
  options: {
    num?: number;
    gl?: string;
    hl?: string;
    page?: number;
  } = {}
): Promise<SerperSearchResponse> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error('Serper API not configured. Add api_key to credentials');
  }

  const num = options.num || 10;
  const cacheKey = getCacheKey(`${query}:${num}:${options.gl || ''}:${options.hl || ''}`, 'search');

  const cached = getFromCache<SerperSearchResult[]>(cacheKey);
  if (cached) {
    logger.debug('Cache HIT', { query: query.slice(0, 50) });
    return { results: cached, cached: true, query };
  }

  logger.debug('Cache MISS, calling API', { query: query.slice(0, 50) });

  const response = await httpsPost<{
    organic?: Array<{
      title: string;
      link: string;
      snippet: string;
      position?: number;
      date?: string;
    }>;
  }>('/search', {
    q: query,
    num,
    ...(options.gl && { gl: options.gl }),
    ...(options.hl && { hl: options.hl }),
    ...(options.page && { page: options.page }),
  }, creds.api_key);

  const results: SerperSearchResult[] = (response.organic || []).map(r => ({
    title: r.title,
    link: r.link,
    snippet: r.snippet,
    position: r.position,
    date: r.date,
  }));

  setCache(cacheKey, results);

  return { results, cached: false, query };
}
