/**
 * GitHub Issues/PRs Search
 */

import { Issue, SearchResponse } from './types.js';
import { API_BASE, getHeaders, logger } from './credentials.js';
import { getCacheKey, getFromCache, setCache } from './cache.js';

export async function searchIssues(
  query: string,
  options: {
    type?: 'issue' | 'pr';
    state?: 'open' | 'closed';
    repo?: string;
    label?: string;
    sort?: 'created' | 'updated' | 'comments';
    limit?: number;
  } = {}
): Promise<SearchResponse<Issue>> {
  const { type, state, repo, label, sort = 'updated', limit = 10 } = options;

  let q = query;
  if (type === 'issue') q += ' is:issue';
  if (type === 'pr') q += ' is:pr';
  if (state) q += ` state:${state}`;
  if (repo) q += ` repo:${repo}`;
  if (label) q += ` label:"${label}"`;

  const cacheKey = getCacheKey(`${q}:${sort}:${limit}`, 'issues');
  const cached = getFromCache<SearchResponse<Issue>>(cacheKey);
  if (cached) {
    logger.debug(`Cache HIT for issues: ${query.slice(0, 50)}`);
    return { ...cached, cached: true };
  }

  logger.info(`Searching issues: ${query.slice(0, 50)}`);

  const params = new URLSearchParams({
    q,
    sort,
    order: 'desc',
    per_page: String(limit)
  });

  const response = await fetch(`${API_BASE}/search/issues?${params}`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as {
    total_count: number;
    items: Issue[];
  };

  const result: SearchResponse<Issue> = {
    items: data.items,
    total_count: data.total_count,
    cached: false
  };

  setCache(cacheKey, result);
  return result;
}
