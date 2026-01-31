/**
 * Reddit Functions (via AnySite)
 */

import { callTool } from './client.js';
import type { RedditPost, RedditComment } from './types.js';

export type SortOption = 'relevance' | 'hot' | 'top' | 'new' | 'comments';
export type TimeFilter = 'all' | 'day' | 'hour' | 'month' | 'week' | 'year';

export interface SearchPostsOptions {
  count?: number;
  sort?: SortOption;
  time_filter?: TimeFilter;
  timeout?: number;
}

export async function searchPosts(
  query: string,
  options: SearchPostsOptions = {}
): Promise<RedditPost[]> {
  const result = await callTool<{ posts: RedditPost[] }>('search_reddit_posts', {
    query,
    count: options.count || 20,
    sort: options.sort || 'relevance',
    time_filter: options.time_filter || 'all',
    request_timeout: options.timeout || 300
  });
  return result.posts || [];
}

export async function getPost(
  postUrl: string,
  timeout?: number
): Promise<RedditPost | null> {
  try {
    return await callTool<RedditPost>('get_reddit_post', {
      post_url: postUrl,
      request_timeout: timeout || 300
    });
  } catch {
    return null;
  }
}

export async function getPostComments(
  postUrl: string,
  timeout?: number
): Promise<RedditComment[]> {
  const result = await callTool<{ comments: RedditComment[] }>('get_reddit_post_comments', {
    post_url: postUrl,
    request_timeout: timeout || 300
  });
  return result.comments || [];
}
