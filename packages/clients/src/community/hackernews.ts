/**
 * Hacker News Functions
 */

import { cache } from './cache.js';
import type { HNStory, HNComment, HNSearchResult, HNSearchOptions } from './types.js';

const HN_BASE = 'https://hacker-news.firebaseio.com/v0';
const ALGOLIA_BASE = 'https://hn.algolia.com/api/v1';

/**
 * Get HN item by ID (internal)
 */
async function getHNItem<T>(id: number): Promise<T | null> {
  const cacheKey = cache.key(String(id), 'hn-item');
  const cached = cache.get(cacheKey) as T | null;
  if (cached) {
    return cached;
  }

  const response = await fetch(`${HN_BASE}/item/${id}.json`);
  if (!response.ok) {
    return null;
  }

  const item = (await response.json()) as T;
  if (item) {
    cache.set(cacheKey, item);
  }
  return item;
}

/**
 * Search Hacker News via Algolia
 */
export async function searchHN(
  query: string,
  options: HNSearchOptions = {}
): Promise<HNSearchResult> {
  const { tags = 'story', limit = 20 } = options;

  const cacheKey = cache.key(`${query}:${tags}:${limit}`, 'hn-search');
  const cached = cache.get(cacheKey) as HNSearchResult | null;
  if (cached) {
    return { ...cached, cached: true };
  }

  const params = new URLSearchParams({
    query,
    tags,
    hitsPerPage: String(limit),
  });

  const response = await fetch(`${ALGOLIA_BASE}/search?${params}`);

  if (!response.ok) {
    throw new Error(`HN Algolia API error ${response.status}`);
  }

  const data = (await response.json()) as {
    hits: Array<{
      objectID: string;
      title: string;
      url?: string;
      author: string;
      points: number;
      num_comments: number;
      created_at_i: number;
      story_text?: string;
    }>;
  };

  const stories: HNStory[] = data.hits.map((hit) => ({
    id: parseInt(hit.objectID, 10),
    title: hit.title,
    url: hit.url,
    text: hit.story_text,
    by: hit.author,
    score: hit.points,
    descendants: hit.num_comments,
    time: hit.created_at_i,
    type: 'story',
  }));

  const result: HNSearchResult = { stories, cached: false };
  cache.set(cacheKey, result);
  return result;
}

/**
 * Get HN front page stories
 */
export async function getHNFrontPage(limit = 30): Promise<HNStory[]> {
  const cacheKey = cache.key(`frontpage:${limit}`, 'hn-front');
  const cached = cache.get(cacheKey) as HNStory[] | null;
  if (cached) {
    return cached;
  }

  const response = await fetch(`${HN_BASE}/topstories.json`);
  if (!response.ok) {
    throw new Error(`HN API error ${response.status}`);
  }

  const ids = (await response.json()) as number[];
  const topIds = ids.slice(0, limit);

  const stories = await Promise.all(topIds.map((id) => getHNItem<HNStory>(id)));

  const validStories = stories.filter((s): s is HNStory => s !== null);
  cache.set(cacheKey, validStories, 10 * 60 * 1000); // 10 min cache
  return validStories;
}

/**
 * Get HN story comments
 */
export async function getHNComments(
  storyId: number,
  options: { limit?: number } = {}
): Promise<HNComment[]> {
  const { limit = 20 } = options;

  const story = await getHNItem<HNStory>(storyId);
  if (!story?.kids) {
    return [];
  }

  const commentIds = story.kids.slice(0, limit);
  const comments = await Promise.all(
    commentIds.map((id) => getHNItem<HNComment>(id))
  );

  return comments.filter((c): c is HNComment => c !== null && !!c.text);
}
