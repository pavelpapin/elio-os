/**
 * LinkedIn Posts Functions (via AnySite)
 */

import { callTool } from './client.js';
import type { LinkedInPost } from './types.js';

export interface SearchPostsOptions {
  keywords?: string;
  sort?: 'recent' | 'relevance';
  date_posted?: 'past-month' | 'past-week';
  content_type?: string;
  authors?: string[];
  author_industries?: string[];
  author_title?: string;
  count?: number;
  timeout?: number;
}

export async function searchPosts(
  options: SearchPostsOptions = {}
): Promise<LinkedInPost[]> {
  const result = await callTool<{ posts: LinkedInPost[] }>('search_linkedin_posts', {
    keywords: options.keywords,
    sort: options.sort,
    date_posted: options.date_posted,
    content_type: options.content_type,
    authors: options.authors,
    author_industries: options.author_industries,
    author_title: options.author_title,
    count: options.count || 20,
    request_timeout: options.timeout || 300
  });
  return result.posts || [];
}

export async function getPost(
  postUrn: string,
  timeout?: number
): Promise<LinkedInPost | null> {
  try {
    return await callTool<LinkedInPost>('get_linkedin_post', {
      urn: postUrn,
      request_timeout: timeout || 300
    });
  } catch {
    return null;
  }
}

export async function getUserPosts(
  userUrn: string,
  count: number = 20,
  timeout?: number
): Promise<LinkedInPost[]> {
  const result = await callTool<{ posts: LinkedInPost[] }>('get_linkedin_user_posts', {
    urn: userUrn,
    count,
    request_timeout: timeout || 300
  });
  return result.posts || [];
}

export async function getCompanyPosts(
  companyUrn: string,
  count: number = 20,
  timeout?: number
): Promise<LinkedInPost[]> {
  const result = await callTool<{ posts: LinkedInPost[] }>('get_linkedin_company_posts', {
    urn: companyUrn,
    count,
    request_timeout: timeout || 300
  });
  return result.posts || [];
}
