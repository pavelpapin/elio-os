/**
 * GitHub Users Search
 */

import { User, SearchResponse } from './types.js';
import { API_BASE, getHeaders, logger } from './credentials.js';
import { getCacheKey, getFromCache, setCache } from './cache.js';

export async function searchUsers(
  query: string,
  options: {
    type?: 'user' | 'org';
    location?: string;
    followers?: string;
    limit?: number;
  } = {}
): Promise<SearchResponse<User>> {
  const { type, location, followers, limit = 10 } = options;

  let q = query;
  if (type) q += ` type:${type}`;
  if (location) q += ` location:${location}`;
  if (followers) q += ` followers:${followers}`;

  const cacheKey = getCacheKey(`${q}:${limit}`, 'users');
  const cached = getFromCache<SearchResponse<User>>(cacheKey);
  if (cached) return { ...cached, cached: true };

  logger.info(`Searching users: ${query.slice(0, 50)}`);

  const params = new URLSearchParams({
    q,
    per_page: String(limit)
  });

  const response = await fetch(`${API_BASE}/search/users?${params}`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status}`);
  }

  const data = await response.json() as {
    total_count: number;
    items: User[];
  };

  const result: SearchResponse<User> = {
    items: data.items,
    total_count: data.total_count,
    cached: false
  };

  setCache(cacheKey, result);
  return result;
}
