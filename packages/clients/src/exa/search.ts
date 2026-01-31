/**
 * Exa.ai Search Functions
 */

import { cache, apiRequest } from './client.js';
import type {
  ExaResult,
  SearchResponse,
  SearchOptions,
  SearchContentsOptions,
} from './types.js';

/**
 * Semantic search - finds content by meaning
 */
export async function search(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const {
    type = 'auto',
    numResults = 10,
    includeDomains,
    excludeDomains,
    startPublishedDate,
    endPublishedDate,
    category,
    useAutoprompt = true,
  } = options;

  const cacheKey = cache.key(
    `${query}:${type}:${numResults}:${includeDomains?.join(',')}:${category}`,
    'search'
  );

  const cached = cache.get(cacheKey) as SearchResponse | null;
  if (cached) {
    return { ...cached, cached: true };
  }

  const body: Record<string, unknown> = {
    query,
    type,
    numResults,
    useAutoprompt,
  };

  if (includeDomains?.length) body.includeDomains = includeDomains;
  if (excludeDomains?.length) body.excludeDomains = excludeDomains;
  if (startPublishedDate) body.startPublishedDate = startPublishedDate;
  if (endPublishedDate) body.endPublishedDate = endPublishedDate;
  if (category) body.category = category;

  const data = await apiRequest<{
    results: ExaResult[];
    autopromptString?: string;
  }>('/search', body);

  const result: SearchResponse = {
    results: data.results,
    autopromptString: data.autopromptString,
    cached: false,
  };

  cache.set(cacheKey, result);
  return result;
}

/**
 * Search and get content/summaries in one call
 */
export async function searchAndContents(
  query: string,
  options: SearchContentsOptions = {}
): Promise<SearchResponse> {
  const {
    type = 'auto',
    numResults = 10,
    includeDomains,
    excludeDomains,
    category,
    text = true,
    highlights = true,
    summary = false,
  } = options;

  const cacheKey = cache.key(
    `${query}:contents:${numResults}:${JSON.stringify(options)}`,
    'search-contents'
  );

  const cached = cache.get(cacheKey) as SearchResponse | null;
  if (cached) {
    return { ...cached, cached: true };
  }

  const contents = buildContentsOptions(text, highlights, summary, query);

  const body: Record<string, unknown> = {
    query,
    type,
    numResults,
    useAutoprompt: true,
    contents,
  };

  if (includeDomains?.length) body.includeDomains = includeDomains;
  if (excludeDomains?.length) body.excludeDomains = excludeDomains;
  if (category) body.category = category;

  const data = await apiRequest<{
    results: ExaResult[];
    autopromptString?: string;
  }>('/search', body);

  const result: SearchResponse = {
    results: data.results,
    autopromptString: data.autopromptString,
    cached: false,
  };

  cache.set(cacheKey, result);
  return result;
}

/**
 * Build contents options object
 */
function buildContentsOptions(
  text: SearchContentsOptions['text'],
  highlights: SearchContentsOptions['highlights'],
  summary: SearchContentsOptions['summary'],
  query: string
): Record<string, unknown> {
  const contents: Record<string, unknown> = {};

  if (text === true) {
    contents.text = { maxCharacters: 3000 };
  } else if (text && typeof text === 'object') {
    contents.text = text;
  }

  if (highlights === true) {
    contents.highlights = { numSentences: 3, highlightsPerUrl: 3 };
  } else if (highlights && typeof highlights === 'object') {
    contents.highlights = highlights;
  }

  if (summary === true) {
    contents.summary = { query };
  } else if (summary && typeof summary === 'object') {
    contents.summary = summary;
  }

  return contents;
}
