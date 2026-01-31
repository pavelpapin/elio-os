/**
 * GitHub Connector Cache
 */

import { createHash } from 'crypto';

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const cache = new Map<string, { data: unknown; expiresAt: number }>();

export function getCacheKey(query: string, type: string): string {
  return `github:${type}:${createHash('md5').update(query).digest('hex')}`;
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

export function getCacheStats(): { size: number } {
  return { size: cache.size };
}

export function clearCache(): void {
  cache.clear();
}
