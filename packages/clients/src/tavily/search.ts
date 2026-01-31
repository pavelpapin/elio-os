/**
 * Tavily Search Functions
 */

import type { TavilySearchResponse, SearchDepth, Topic } from './types.js';
import {
  getCredentials,
  getCacheKey,
  getFromCache,
  setCache,
  API_BASE,
  CACHE_TTL
} from './client.js';
import { createLogger } from '@elio/shared';

const logger = createLogger('clients:tavily');

export async function search(
  query: string,
  options: {
    search_depth?: SearchDepth;
    topic?: Topic;
    max_results?: number;
    include_answer?: boolean;
    include_domains?: string[];
    exclude_domains?: string[];
  } = {}
): Promise<TavilySearchResponse> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error('Tavily API not configured. Add api_key to credentials');
  }

  const {
    search_depth = 'basic',
    topic = 'general',
    max_results = 10,
    include_answer = true,
    include_domains,
    exclude_domains
  } = options;

  const cacheKey = getCacheKey(
    `${query}:${search_depth}:${topic}:${max_results}:${include_answer}`,
    'search'
  );

  const cached = getFromCache<TavilySearchResponse>(cacheKey);
  if (cached) {
    logger.debug('Cache HIT', { query: query.slice(0, 50) });
    return { ...cached, cached: true };
  }

  logger.debug('Searching', { query: query.slice(0, 50) });

  const body: Record<string, unknown> = {
    api_key: creds.api_key,
    query,
    search_depth,
    topic,
    max_results,
    include_answer
  };

  if (include_domains?.length) {
    body.include_domains = include_domains;
  }
  if (exclude_domains?.length) {
    body.exclude_domains = exclude_domains;
  }

  const response = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tavily API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as {
    query: string;
    answer?: string;
    results: Array<{
      title: string;
      url: string;
      content: string;
      score: number;
      published_date?: string;
    }>;
    response_time?: number;
  };

  const result: TavilySearchResponse = {
    query: data.query,
    answer: data.answer,
    results: data.results.map(r => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
      published_date: r.published_date
    })),
    cached: false,
    response_time: data.response_time
  };

  // Cache based on topic (news = shorter TTL)
  const ttl = topic === 'news' ? 6 * 60 * 60 * 1000 : CACHE_TTL;
  setCache(cacheKey, result, ttl);

  return result;
}

export async function searchNews(
  query: string,
  options: { max_results?: number; days?: number } = {}
): Promise<TavilySearchResponse> {
  return search(query, {
    topic: 'news',
    search_depth: 'advanced',
    max_results: options.max_results || 10
  });
}

export async function research(
  query: string,
  options: { max_results?: number } = {}
): Promise<TavilySearchResponse> {
  return search(query, {
    search_depth: 'advanced',
    include_answer: true,
    max_results: options.max_results || 10
  });
}

export async function searchDomains(
  query: string,
  domains: string[],
  options: { max_results?: number } = {}
): Promise<TavilySearchResponse> {
  return search(query, {
    search_depth: 'advanced',
    include_domains: domains,
    max_results: options.max_results || 10
  });
}
