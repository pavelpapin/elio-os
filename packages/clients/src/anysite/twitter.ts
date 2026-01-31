/**
 * Twitter/X Functions (via AnySite)
 */

import { callTool } from './client.js';
import type { TwitterPost, TwitterUser } from './types.js';

// Search

export interface SearchPostsOptions {
  query?: string;
  exact_phrase?: string;
  any_of_these_words?: string;
  none_of_these_words?: string;
  these_hashtags?: string[];
  language?: string;
  from_these_accounts?: string[];
  to_these_accounts?: string[];
  mentioning_these_accounts?: string[];
  min_replies?: number;
  min_likes?: number;
  min_retweets?: number;
  from_date?: string;
  to_date?: string;
  search_type?: 'Top' | 'Latest';
  count?: number;
  timeout?: number;
}

export async function searchPosts(
  options: SearchPostsOptions = {}
): Promise<TwitterPost[]> {
  const result = await callTool<{ posts: TwitterPost[] }>('search_twitter_posts', {
    query: options.query,
    exact_phrase: options.exact_phrase,
    any_of_these_words: options.any_of_these_words,
    none_of_these_words: options.none_of_these_words,
    these_hashtags: options.these_hashtags,
    language: options.language,
    from_these_accounts: options.from_these_accounts,
    to_these_accounts: options.to_these_accounts,
    mentioning_these_accounts: options.mentioning_these_accounts,
    min_replies: options.min_replies,
    min_likes: options.min_likes,
    min_retweets: options.min_retweets,
    from_date: options.from_date,
    to_date: options.to_date,
    search_type: options.search_type || 'Top',
    count: options.count || 20,
    request_timeout: options.timeout || 300
  });
  return result.posts || [];
}

export interface SearchUsersOptions {
  query?: string;
  count?: number;
  timeout?: number;
}

export async function searchUsers(
  options: SearchUsersOptions = {}
): Promise<TwitterUser[]> {
  const result = await callTool<{ users: TwitterUser[] }>('search_twitter_users', {
    query: options.query,
    count: options.count || 20,
    request_timeout: options.timeout || 300
  });
  return result.users || [];
}

// Users

export async function getUser(
  userAliasOrUrl: string,
  timeout?: number
): Promise<TwitterUser | null> {
  try {
    return await callTool<TwitterUser>('get_twitter_user', {
      user: userAliasOrUrl,
      request_timeout: timeout || 300
    });
  } catch {
    return null;
  }
}

export interface GetUserPostsOptions {
  count?: number;
  timeout?: number;
}

export async function getUserPosts(
  userAliasOrUrl: string,
  options: GetUserPostsOptions = {}
): Promise<TwitterPost[]> {
  const result = await callTool<{ posts: TwitterPost[] }>('get_twitter_user_posts', {
    user: userAliasOrUrl,
    count: options.count || 20,
    request_timeout: options.timeout || 300
  });
  return result.posts || [];
}
