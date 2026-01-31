/**
 * Combined Web Search
 */

import type { DuckDuckGoResult, GoogleNewsResult } from './types.js';
import { duckduckgoSearch } from './duckduckgo.js';
import { googleNewsRss } from './google-news.js';

export async function combinedSearch(
  query: string,
  options: {
    includeNews?: boolean;
    maxResults?: number;
  } = {}
): Promise<{
  web: DuckDuckGoResult[];
  news: GoogleNewsResult[];
}> {
  const maxResults = options.maxResults || 10;

  const [web, news] = await Promise.all([
    duckduckgoSearch(query, maxResults),
    options.includeNews ? googleNewsRss(query, maxResults) : Promise.resolve([])
  ]);

  return { web, news };
}
