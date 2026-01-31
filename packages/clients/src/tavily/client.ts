/**
 * Tavily Client - Credentials and Cache
 */

import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { paths, createLogger } from '@elio/shared';

const logger = createLogger('clients:tavily');

const CREDENTIALS_PATH = paths.credentials.tavily;
export const API_BASE = 'https://api.tavily.com';
export const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const cache = new Map<string, { data: unknown; expiresAt: number }>();

export function getCredentials(): { api_key: string } | null {
  if (!existsSync(CREDENTIALS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8'));
  } catch (error) {
    logger.error('Failed to parse credentials', { error });
    return null;
  }
}

export function getCacheKey(query: string, type: string): string {
  return `tavily:${type}:${createHash('md5').update(query).digest('hex')}`;
}

export function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data as T;
  if (entry) cache.delete(key);
  return null;
}

export function setCache(key: string, data: unknown, ttl = CACHE_TTL): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

export function isAuthenticated(): boolean {
  return getCredentials() !== null;
}

export function getCacheStats(): { size: number } {
  return { size: cache.size };
}

export function clearCache(): void {
  cache.clear();
}
