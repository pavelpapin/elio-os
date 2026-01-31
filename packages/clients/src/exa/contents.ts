/**
 * Exa.ai Content Functions
 * Find similar pages and get contents
 */

import { cache, apiRequest } from './client.js';
import type {
  ExaResult,
  SearchResponse,
  ContentsResponse,
  FindSimilarOptions,
  ContentsOptions,
} from './types.js';

/**
 * Find similar pages to a given URL
 */
export async function findSimilar(
  url: string,
  options: FindSimilarOptions = {}
): Promise<SearchResponse> {
  const {
    numResults = 10,
    includeDomains,
    excludeDomains,
    excludeSourceDomain = true,
    category,
  } = options;

  const cacheKey = cache.key(`${url}:${numResults}`, 'similar');
  const cached = cache.get(cacheKey) as SearchResponse | null;
  if (cached) {
    return { ...cached, cached: true };
  }

  const body: Record<string, unknown> = {
    url,
    numResults,
    excludeSourceDomain,
  };

  if (includeDomains?.length) body.includeDomains = includeDomains;
  if (excludeDomains?.length) body.excludeDomains = excludeDomains;
  if (category) body.category = category;

  const data = await apiRequest<{ results: ExaResult[] }>('/findSimilar', body);

  const result: SearchResponse = {
    results: data.results,
    cached: false,
  };

  cache.set(cacheKey, result);
  return result;
}

/**
 * Get contents for specific URLs/IDs
 */
export async function getContents(
  ids: string[],
  options: ContentsOptions = {}
): Promise<ContentsResponse> {
  const { text = true, highlights = true, summary = false } = options;

  const cacheKey = cache.key(ids.join(','), 'contents');
  const cached = cache.get(cacheKey) as ContentsResponse | null;
  if (cached) {
    return { ...cached, cached: true };
  }

  const body: Record<string, unknown> = { ids };

  if (text === true) {
    body.text = { maxCharacters: 3000 };
  } else if (text) {
    body.text = text;
  }

  if (highlights === true) {
    body.highlights = { numSentences: 3 };
  } else if (highlights) {
    body.highlights = highlights;
  }

  if (summary === true) {
    body.summary = {};
  } else if (summary) {
    body.summary = summary;
  }

  const data = await apiRequest<{ results: ExaResult[] }>('/contents', body);

  const result: ContentsResponse = {
    results: data.results,
    cached: false,
  };

  cache.set(cacheKey, result);
  return result;
}
