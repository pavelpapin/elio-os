/**
 * Serper Image Search
 */

import type { SerperImageResult } from './types.js';
import { getCacheKey, getFromCache, setCache, getCredentials, httpsPost } from './client.js';
import { createLogger } from '@elio/shared';

const logger = createLogger('clients:serper');

export async function searchImages(
  query: string,
  options: { num?: number; gl?: string } = {}
): Promise<{
  results: SerperImageResult[];
  cached: boolean;
  query: string;
}> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error('Serper API not configured');
  }

  const num = options.num || 10;
  const cacheKey = getCacheKey(`${query}:${num}`, 'images');

  const cached = getFromCache<SerperImageResult[]>(cacheKey);
  if (cached) {
    logger.debug('Images cache HIT', { query: query.slice(0, 50) });
    return { results: cached, cached: true, query };
  }

  const response = await httpsPost<{
    images?: SerperImageResult[];
  }>('/images', {
    q: query,
    num,
    ...(options.gl && { gl: options.gl }),
  }, creds.api_key);

  const results = response.images || [];
  setCache(cacheKey, results);

  return { results, cached: false, query };
}
