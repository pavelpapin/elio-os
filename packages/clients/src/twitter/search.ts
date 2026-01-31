/**
 * Twitter/X Search Functions
 */

import { duckduckgoSearch } from '../webscraping/index.js';
import { cache, apiRequest, getBearerToken, isApiExhausted } from './client.js';
import type { Tweet, SearchResult } from './types.js';

/**
 * Search via Twitter API
 */
async function searchViaApi(query: string, maxResults: number): Promise<SearchResult> {
  const params = new URLSearchParams({
    query,
    max_results: String(maxResults),
    'tweet.fields': 'created_at,public_metrics,author_id',
    expansions: 'author_id',
    'user.fields': 'name,username,verified',
  });

  interface ApiResponse {
    data?: Array<{
      id: string;
      text: string;
      author_id: string;
      created_at?: string;
      public_metrics?: Tweet['public_metrics'];
    }>;
    includes?: { users?: Array<{ id: string; name: string; username: string }> };
    meta?: { result_count: number };
  }

  const response = await apiRequest<ApiResponse>('/tweets/search/recent', params);

  const usersMap = new Map<string, { name: string; username: string }>();
  response.includes?.users?.forEach((u) =>
    usersMap.set(u.id, { name: u.name, username: u.username })
  );

  const tweets: Tweet[] = (response.data || []).map((t) => {
    const author = usersMap.get(t.author_id);
    return {
      id: t.id,
      text: t.text,
      author_id: t.author_id,
      author_name: author?.name,
      author_username: author?.username,
      created_at: t.created_at,
      public_metrics: t.public_metrics,
      url: author ? `https://x.com/${author.username}/status/${t.id}` : undefined,
      source: 'api' as const,
    };
  });

  return {
    tweets,
    cached: false,
    query,
    result_count: response.meta?.result_count || tweets.length,
    source: 'api',
  };
}

/**
 * Parse tweet from DuckDuckGo search result
 */
export function parseTweetFromSearchResult(result: {
  title: string;
  url: string;
  snippet: string;
}): Tweet | null {
  const match = result.url.match(/(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/);
  if (!match) return null;

  const [, username, tweetId] = match;
  const nameMatch = result.title.match(/^([^(]+)\s*\(@?\w+\)/);

  return {
    id: tweetId,
    text: result.snippet,
    author_username: username,
    author_name: nameMatch ? nameMatch[1].trim() : username,
    url: result.url.replace('twitter.com', 'x.com'),
    source: 'scrape',
  };
}

/**
 * Search via DuckDuckGo
 */
async function searchViaDuckDuckGo(
  query: string,
  maxResults: number
): Promise<SearchResult> {
  const results = await duckduckgoSearch(
    `site:x.com OR site:twitter.com ${query}`,
    maxResults * 2
  );

  const tweets: Tweet[] = [];
  for (const result of results) {
    const tweet = parseTweetFromSearchResult(result);
    if (tweet && tweets.length < maxResults) {
      tweets.push(tweet);
    }
  }

  return {
    tweets,
    cached: false,
    query,
    result_count: tweets.length,
    source: 'scrape',
  };
}

/**
 * Search recent tweets (last 7 days)
 */
export async function searchTweets(
  query: string,
  options: { max_results?: number } = {}
): Promise<SearchResult> {
  const maxResults = Math.max(options.max_results || 10, 10);
  const cacheKey = cache.key(`${query}:${maxResults}`, 'search');

  const cached = cache.get(cacheKey) as SearchResult | null;
  if (cached) {
    return { ...cached, cached: true, source: 'cache' };
  }

  // Try API first
  if (!isApiExhausted() && getBearerToken()) {
    try {
      const result = await searchViaApi(query, maxResults);
      cache.set(cacheKey, result);
      return result;
    } catch (error) {
      if ((error as Error).message !== 'API_CREDITS_EXHAUSTED') {
        // Log but continue to fallback
      }
    }
  }

  // DuckDuckGo fallback
  try {
    const result = await searchViaDuckDuckGo(query, maxResults);
    cache.set(cacheKey, result);
    return result;
  } catch {
    return { tweets: [], cached: false, query, result_count: 0, source: 'scrape' };
  }
}
