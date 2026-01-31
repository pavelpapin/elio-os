/**
 * GitHub Repository Functions
 */

import { Repository, User } from './types.js';
import { API_BASE, getHeaders } from './credentials.js';
import { getCacheKey, getFromCache, setCache } from './cache.js';

/**
 * Get repository details
 */
export async function getRepo(owner: string, repo: string): Promise<Repository | null> {
  const cacheKey = getCacheKey(`${owner}/${repo}`, 'repo');
  const cached = getFromCache<Repository>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${API_BASE}/repos/${owner}/${repo}`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`GitHub API error ${response.status}`);
  }

  const repository = await response.json() as Repository;
  setCache(cacheKey, repository);
  return repository;
}

/**
 * Get repository README
 */
export async function getReadme(owner: string, repo: string): Promise<string | null> {
  const cacheKey = getCacheKey(`${owner}/${repo}/readme`, 'readme');
  const cached = getFromCache<string>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${API_BASE}/repos/${owner}/${repo}/readme`, {
    headers: {
      ...getHeaders(),
      'Accept': 'application/vnd.github.raw'
    }
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`GitHub API error ${response.status}`);
  }

  const content = await response.text();
  setCache(cacheKey, content);
  return content;
}

/**
 * Get user profile
 */
export async function getUser(username: string): Promise<User | null> {
  const cacheKey = getCacheKey(username, 'user');
  const cached = getFromCache<User>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${API_BASE}/users/${username}`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`GitHub API error ${response.status}`);
  }

  const user = await response.json() as User;
  setCache(cacheKey, user);
  return user;
}
