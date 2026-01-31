/**
 * Brave Search Connector
 * With caching to minimize API costs
 */

import {
  logger, getCacheKey, getFromCache, setCache,
  getCredentials, httpsRequest,
  isAuthenticated, getCacheStats, clearCache
} from './cache.js';

export { isAuthenticated, getCacheStats, clearCache } from './cache.js';

export interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  age?: string;
}

export interface BraveSearchResponse {
  results: BraveSearchResult[];
  cached: boolean;
  query: string;
}

export async function search(
  query: string,
  options: {
    count?: number;
    freshness?: 'pd' | 'pw' | 'pm' | 'py';
    country?: string;
  } = {}
): Promise<BraveSearchResponse> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error('Brave API not configured. Add api_key to /root/.claude/secrets/brave.json');
  }

  const count = options.count || 10;
  const cacheKey = getCacheKey(`${query}:${count}:${options.freshness || ''}`, 'search');

  const cached = getFromCache<BraveSearchResult[]>(cacheKey);
  if (cached) {
    logger.debug('Cache HIT', { query: query.slice(0, 50) });
    return { results: cached, cached: true, query };
  }

  logger.debug('Cache MISS, calling API', { query: query.slice(0, 50) });

  const params = new URLSearchParams({
    q: query,
    count: String(count),
  });

  if (options.freshness) params.set('freshness', options.freshness);
  if (options.country) params.set('country', options.country);

  const response = await httpsRequest<{
    web?: { results: Array<{ title: string; url: string; description: string; age?: string }> };
  }>({
    hostname: 'api.search.brave.com',
    path: `/res/v1/web/search?${params}`,
    method: 'GET',
    headers: {
      'X-Subscription-Token': creds.api_key,
      'Accept': 'application/json'
    }
  });

  const results: BraveSearchResult[] = (response.web?.results || []).map(r => ({
    title: r.title, url: r.url, description: r.description, age: r.age
  }));

  setCache(cacheKey, results);
  return { results, cached: false, query };
}

export async function searchNews(
  query: string,
  options: { count?: number; freshness?: 'pd' | 'pw' | 'pm' } = {}
): Promise<BraveSearchResponse> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error('Brave API not configured');
  }

  const count = options.count || 10;
  const freshness = options.freshness || 'pw';
  const cacheKey = getCacheKey(`${query}:${count}:${freshness}`, 'news');

  const cached = getFromCache<BraveSearchResult[]>(cacheKey);
  if (cached) {
    return { results: cached, cached: true, query };
  }

  const params = new URLSearchParams({
    q: query, count: String(count), freshness, news: 'true'
  });

  const response = await httpsRequest<{
    news?: { results: Array<{ title: string; url: string; description: string; age?: string }> };
  }>({
    hostname: 'api.search.brave.com',
    path: `/res/v1/web/search?${params}`,
    method: 'GET',
    headers: {
      'X-Subscription-Token': creds.api_key,
      'Accept': 'application/json'
    }
  });

  const results: BraveSearchResult[] = (response.news?.results || []).map(r => ({
    title: r.title, url: r.url, description: r.description, age: r.age
  }));

  setCache(cacheKey, results, 24 * 60 * 60 * 1000);
  return { results, cached: false, query };
}
