/**
 * GitHub Repository Search
 */

import { Repository, SearchResponse } from './types.js';
import { API_BASE, getHeaders, logger } from './credentials.js';
import { getCacheKey, getFromCache, setCache } from './cache.js';

export async function searchRepos(
  query: string,
  options: {
    language?: string;
    sort?: 'stars' | 'forks' | 'updated' | 'help-wanted-issues';
    order?: 'asc' | 'desc';
    minStars?: number;
    limit?: number;
  } = {}
): Promise<SearchResponse<Repository>> {
  const {
    language,
    sort = 'stars',
    order = 'desc',
    minStars,
    limit = 10
  } = options;

  let q = query;
  if (language) q += ` language:${language}`;
  if (minStars) q += ` stars:>=${minStars}`;

  const cacheKey = getCacheKey(`${q}:${sort}:${order}:${limit}`, 'repos');
  const cached = getFromCache<SearchResponse<Repository>>(cacheKey);
  if (cached) {
    logger.debug(`Cache HIT for repos: ${query.slice(0, 50)}`);
    return { ...cached, cached: true };
  }

  logger.info(`Searching repos: ${query.slice(0, 50)}`);

  const params = new URLSearchParams({
    q,
    sort,
    order,
    per_page: String(limit)
  });

  const response = await fetch(`${API_BASE}/search/repositories?${params}`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as {
    total_count: number;
    items: Repository[];
  };

  const result: SearchResponse<Repository> = {
    items: data.items,
    total_count: data.total_count,
    cached: false
  };

  setCache(cacheKey, result);
  return result;
}
