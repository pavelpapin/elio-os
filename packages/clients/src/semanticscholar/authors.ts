/**
 * Semantic Scholar Author Functions
 */

import { cache, apiRequest, PAPER_FIELDS } from './client.js';
import type { Author, Paper } from './types.js';

const AUTHOR_FIELDS = 'authorId,name,affiliations,paperCount,citationCount,hIndex';

/**
 * Search for authors
 */
export async function searchAuthors(
  query: string,
  options: { limit?: number } = {}
): Promise<Author[]> {
  const { limit = 5 } = options;

  const cacheKey = cache.key(`${query}:${limit}`, 'authors');
  const cached = cache.get(cacheKey) as Author[] | null;
  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    query,
    limit: String(limit),
    fields: AUTHOR_FIELDS,
  });

  const data = await apiRequest<{ data: Author[] }>(`/author/search?${params}`);
  const authors = data.data || [];

  cache.set(cacheKey, authors);
  return authors;
}

/**
 * Get author details
 */
export async function getAuthor(authorId: string): Promise<Author | null> {
  const cacheKey = cache.key(authorId, 'author');
  const cached = cache.get(cacheKey) as Author | null;
  if (cached) {
    return cached;
  }

  try {
    const params = new URLSearchParams({ fields: AUTHOR_FIELDS });
    const author = await apiRequest<Author>(`/author/${authorId}?${params}`);
    cache.set(cacheKey, author);
    return author;
  } catch (err) {
    if (String(err).includes('404')) {
      return null;
    }
    throw err;
  }
}

/**
 * Get author's papers
 */
export async function getAuthorPapers(
  authorId: string,
  options: { limit?: number } = {}
): Promise<Paper[]> {
  const { limit = 10 } = options;

  const cacheKey = cache.key(`${authorId}:papers:${limit}`, 'author-papers');
  const cached = cache.get(cacheKey) as Paper[] | null;
  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    limit: String(limit),
    fields: PAPER_FIELDS,
  });

  const data = await apiRequest<{ data: Paper[] }>(
    `/author/${authorId}/papers?${params}`
  );
  const papers = data.data || [];

  cache.set(cacheKey, papers);
  return papers;
}
