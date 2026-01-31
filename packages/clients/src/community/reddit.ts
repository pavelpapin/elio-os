/**
 * Reddit Functions
 */

import { cache } from './cache.js';
import type {
  RedditPost,
  RedditComment,
  RedditSearchResult,
  RedditSearchOptions,
  SubredditOptions,
} from './types.js';

const REDDIT_BASE = 'https://www.reddit.com';
const USER_AGENT = 'Elio Research Bot/1.0';

/**
 * Search Reddit posts
 */
export async function searchReddit(
  query: string,
  options: RedditSearchOptions = {}
): Promise<RedditSearchResult> {
  const {
    subreddit,
    sort = 'relevance',
    time = 'month',
    limit = 25,
  } = options;

  const cacheKey = cache.key(
    `${query}:${subreddit}:${sort}:${time}:${limit}`,
    'reddit-search'
  );
  const cached = cache.get(cacheKey) as RedditSearchResult | null;
  if (cached) {
    return { ...cached, cached: true };
  }

  const baseUrl = subreddit
    ? `${REDDIT_BASE}/r/${subreddit}/search.json`
    : `${REDDIT_BASE}/search.json`;

  const params = new URLSearchParams({
    q: query,
    sort,
    t: time,
    limit: String(limit),
    restrict_sr: subreddit ? 'true' : 'false',
  });

  const response = await fetch(`${baseUrl}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Reddit API error ${response.status}`);
  }

  const data = (await response.json()) as {
    data: { children: Array<{ data: RedditPost }> };
  };

  const posts = mapRedditPosts(data.data.children);
  const result: RedditSearchResult = { posts, cached: false };
  cache.set(cacheKey, result);
  return result;
}

/**
 * Get subreddit hot/top posts
 */
export async function getSubreddit(
  subreddit: string,
  options: SubredditOptions = {}
): Promise<RedditSearchResult> {
  const { sort = 'hot', time = 'week', limit = 25 } = options;

  const cacheKey = cache.key(
    `${subreddit}:${sort}:${time}:${limit}`,
    'subreddit'
  );
  const cached = cache.get(cacheKey) as RedditSearchResult | null;
  if (cached) {
    return { ...cached, cached: true };
  }

  const params = new URLSearchParams({
    limit: String(limit),
    t: time,
  });

  const url = `${REDDIT_BASE}/r/${subreddit}/${sort}.json?${params}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Reddit API error ${response.status}`);
  }

  const data = (await response.json()) as {
    data: { children: Array<{ data: RedditPost }> };
  };

  const posts = mapRedditPosts(data.data.children);
  const result: RedditSearchResult = { posts, cached: false };
  cache.set(cacheKey, result);
  return result;
}

/**
 * Get post comments
 */
export async function getRedditComments(
  postId: string,
  options: { limit?: number; sort?: 'top' | 'best' | 'new' | 'controversial' } = {}
): Promise<RedditComment[]> {
  const { limit = 50, sort = 'top' } = options;

  const cacheKey = cache.key(`${postId}:${sort}:${limit}`, 'reddit-comments');
  const cached = cache.get(cacheKey) as RedditComment[] | null;
  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({ limit: String(limit), sort });
  const url = `${REDDIT_BASE}/comments/${postId}.json?${params}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Reddit API error ${response.status}`);
  }

  const data = (await response.json()) as Array<{
    data: { children: Array<{ data: RedditComment; kind: string }> };
  }>;

  const commentData = data[1]?.data?.children || [];
  const comments = commentData
    .filter((c) => c.kind === 't1')
    .map((c) => ({
      id: c.data.id,
      body: c.data.body,
      author: c.data.author,
      score: c.data.score,
      created_utc: c.data.created_utc,
      permalink: `https://reddit.com${c.data.permalink}`,
    }));

  cache.set(cacheKey, comments);
  return comments;
}

/**
 * Map Reddit API response to RedditPost[]
 */
function mapRedditPosts(
  children: Array<{ data: RedditPost }>
): RedditPost[] {
  return children.map((child) => ({
    id: child.data.id,
    title: child.data.title,
    selftext: child.data.selftext,
    url: child.data.url,
    permalink: `https://reddit.com${child.data.permalink}`,
    subreddit: child.data.subreddit,
    author: child.data.author,
    score: child.data.score,
    upvote_ratio: child.data.upvote_ratio,
    num_comments: child.data.num_comments,
    created_utc: child.data.created_utc,
    is_self: child.data.is_self,
    link_flair_text: child.data.link_flair_text,
  }));
}
