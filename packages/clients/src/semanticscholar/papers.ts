/**
 * Semantic Scholar Paper Functions
 */

import { cache, apiRequest, PAPER_FIELDS, PAPER_FIELDS_SHORT } from './client.js';
import type {
  Paper,
  SearchResponse,
  SearchOptions,
  CitationsResponse,
  ReferencesResponse,
} from './types.js';

/**
 * Search for papers
 */
export async function searchPapers(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const {
    limit = 10,
    offset = 0,
    year,
    fieldsOfStudy,
    openAccessOnly = false,
  } = options;

  const cacheKey = cache.key(
    `${query}:${limit}:${offset}:${year}:${fieldsOfStudy?.join(',')}:${openAccessOnly}`,
    'search'
  );

  const cached = cache.get(cacheKey) as SearchResponse | null;
  if (cached) {
    return { ...cached, cached: true };
  }

  const params = new URLSearchParams({
    query,
    limit: String(limit),
    offset: String(offset),
    fields: PAPER_FIELDS,
  });

  if (year) params.set('year', year);
  if (fieldsOfStudy?.length) params.set('fieldsOfStudy', fieldsOfStudy.join(','));
  if (openAccessOnly) params.set('openAccessPdf', '');

  const data = await apiRequest<{ total: number; data: Paper[] }>(
    `/paper/search?${params}`
  );

  const result: SearchResponse = {
    papers: data.data || [],
    total: data.total || 0,
    cached: false,
  };

  cache.set(cacheKey, result);
  return result;
}

/**
 * Get paper details by ID
 */
export async function getPaper(paperId: string): Promise<Paper | null> {
  const cacheKey = cache.key(paperId, 'paper');
  const cached = cache.get(cacheKey) as Paper | null;
  if (cached) {
    return cached;
  }

  try {
    const paper = await apiRequest<Paper>(`/paper/${paperId}?fields=${PAPER_FIELDS}`);
    cache.set(cacheKey, paper);
    return paper;
  } catch (err) {
    if (String(err).includes('404')) {
      return null;
    }
    throw err;
  }
}

/**
 * Get paper citations
 */
export async function getCitations(
  paperId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<CitationsResponse> {
  const { limit = 10, offset = 0 } = options;

  const cacheKey = cache.key(`${paperId}:${limit}:${offset}`, 'citations');
  const cached = cache.get(cacheKey) as CitationsResponse | null;
  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    fields: PAPER_FIELDS_SHORT,
  });

  const data = await apiRequest<{ data: Array<{ citingPaper: Paper }> }>(
    `/paper/${paperId}/citations?${params}`
  );

  const result: CitationsResponse = {
    citations: data.data.map((d) => d.citingPaper),
    total: data.data.length,
  };

  cache.set(cacheKey, result);
  return result;
}

/**
 * Get paper references
 */
export async function getReferences(
  paperId: string,
  options: { limit?: number } = {}
): Promise<ReferencesResponse> {
  const { limit = 10 } = options;

  const cacheKey = cache.key(`${paperId}:refs:${limit}`, 'references');
  const cached = cache.get(cacheKey) as ReferencesResponse | null;
  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    limit: String(limit),
    fields: PAPER_FIELDS_SHORT,
  });

  const data = await apiRequest<{ data: Array<{ citedPaper: Paper }> }>(
    `/paper/${paperId}/references?${params}`
  );

  const result: ReferencesResponse = {
    references: data.data.map((d) => d.citedPaper).filter((p) => p.paperId),
    total: data.data.length,
  };

  cache.set(cacheKey, result);
  return result;
}
