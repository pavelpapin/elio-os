/**
 * LinkedIn Profile Cache
 */

import { createHash } from 'crypto';
import type { ScrapedProfile } from './types.js';

interface CacheEntry {
  data: ScrapedProfile;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days for profiles

export function getCacheKey(identifier: string): string {
  return `linkedin:${createHash('md5').update(identifier.toLowerCase()).digest('hex')}`;
}

export function getFromCache(key: string): ScrapedProfile | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return { ...entry.data, source: 'cache' };
  }
  return null;
}

export function setCache(key: string, data: ScrapedProfile): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

export function getCacheStats(): { size: number } {
  return { size: cache.size };
}

export function clearCache(): void {
  cache.clear();
}
