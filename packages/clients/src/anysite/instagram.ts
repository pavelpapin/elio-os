/**
 * Instagram Functions (via AnySite)
 */

import { callTool } from './client.js';
import type { InstagramPost, InstagramUser } from './types.js';

// Posts

export async function getPost(
  postId: string,
  timeout?: number
): Promise<InstagramPost | null> {
  try {
    return await callTool<InstagramPost>('get_instagram_post', {
      post: postId,
      request_timeout: timeout || 300
    });
  } catch {
    return null;
  }
}

export interface GetPostCommentsOptions {
  count?: number;
  timeout?: number;
}

export async function getPostComments(
  postId: string,
  options: GetPostCommentsOptions = {}
): Promise<Array<{ author: string; text: string; likes?: number }>> {
  const result = await callTool<{ comments: Array<{ author: string; text: string; likes?: number }> }>(
    'get_instagram_post_comments',
    {
      post: postId,
      count: options.count || 50,
      request_timeout: options.timeout || 300
    }
  );
  return result.comments || [];
}

export async function getPostLikes(
  postId: string,
  count: number = 50,
  timeout?: number
): Promise<Array<{ username: string; name?: string }>> {
  const result = await callTool<{ likes: Array<{ username: string; name?: string }> }>(
    'get_instagram_post_likes',
    {
      post: postId,
      count,
      request_timeout: timeout || 300
    }
  );
  return result.likes || [];
}

export interface SearchPostsOptions {
  count?: number;
  timeout?: number;
}

export async function searchPosts(
  query: string,
  options: SearchPostsOptions = {}
): Promise<InstagramPost[]> {
  const result = await callTool<{ posts: InstagramPost[] }>('search_instagram_posts', {
    query,
    count: options.count || 20,
    request_timeout: options.timeout || 300
  });
  return result.posts || [];
}

// Users

export interface GetUserOptions {
  with_creation_date?: boolean;
  timeout?: number;
}

export async function getUser(
  userIdOrAlias: string,
  options: GetUserOptions = {}
): Promise<InstagramUser | null> {
  try {
    return await callTool<InstagramUser>('get_instagram_user', {
      user: userIdOrAlias,
      with_creation_date: options.with_creation_date,
      request_timeout: options.timeout || 300
    });
  } catch {
    return null;
  }
}

export interface GetUserFriendshipsOptions {
  count?: number;
  type?: 'followers' | 'following';
  timeout?: number;
}

export async function getUserFriendships(
  userIdOrAlias: string,
  options: GetUserFriendshipsOptions = {}
): Promise<Array<{ username: string; name?: string }>> {
  const result = await callTool<{ users: Array<{ username: string; name?: string }> }>(
    'get_instagram_user_friendships',
    {
      user: userIdOrAlias,
      count: options.count || 50,
      type: options.type || 'followers',
      request_timeout: options.timeout || 300
    }
  );
  return result.users || [];
}

export interface GetUserPostsOptions {
  count?: number;
  timeout?: number;
}

export async function getUserPosts(
  userIdOrAlias: string,
  options: GetUserPostsOptions = {}
): Promise<InstagramPost[]> {
  const result = await callTool<{ posts: InstagramPost[] }>('get_instagram_user_posts', {
    user: userIdOrAlias,
    count: options.count || 20,
    request_timeout: options.timeout || 300
  });
  return result.posts || [];
}

export async function getUserReels(
  userIdOrAlias: string,
  options: GetUserPostsOptions = {}
): Promise<InstagramPost[]> {
  const result = await callTool<{ reels: InstagramPost[] }>('get_instagram_user_reels', {
    user: userIdOrAlias,
    count: options.count || 20,
    request_timeout: options.timeout || 300
  });
  return result.reels || [];
}
