/**
 * GitHub Code Search
 */

import { CodeResult, SearchResponse } from './types.js';
import { API_BASE, getHeaders, logger } from './credentials.js';
import { getCacheKey, getFromCache, setCache } from './cache.js';

export async function searchCode(
  query: string,
  options: {
    language?: string;
    repo?: string;
    path?: string;
    extension?: string;
    limit?: number;
  } = {}
): Promise<SearchResponse<CodeResult>> {
  const { language, repo, path, extension, limit = 10 } = options;

  let q = query;
  if (language) q += ` language:${language}`;
  if (repo) q += ` repo:${repo}`;
  if (path) q += ` path:${path}`;
  if (extension) q += ` extension:${extension}`;

  const cacheKey = getCacheKey(`${q}:${limit}`, 'code');
  const cached = getFromCache<SearchResponse<CodeResult>>(cacheKey);
  if (cached) {
    logger.debug(`Cache HIT for code: ${query.slice(0, 50)}`);
    return { ...cached, cached: true };
  }

  logger.info(`Searching code: ${query.slice(0, 50)}`);

  const params = new URLSearchParams({
    q,
    per_page: String(limit)
  });

  const response = await fetch(`${API_BASE}/search/code?${params}`, {
    headers: {
      ...getHeaders(),
      'Accept': 'application/vnd.github.text-match+json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as {
    total_count: number;
    items: CodeResult[];
  };

  const result: SearchResponse<CodeResult> = {
    items: data.items,
    total_count: data.total_count,
    cached: false
  };

  setCache(cacheKey, result);
  return result;
}
