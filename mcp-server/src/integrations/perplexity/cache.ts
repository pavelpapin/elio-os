/**
 * Perplexity API cache utilities
 */

import { createHash } from 'crypto';
import { CACHE_TTL, type SearchResult } from './perplexity-types.js';

// Cache with TTL
const cache = new Map<string, { data: SearchResult; expiresAt: number }>();

export function getCacheKey(query: string, model: string, extra?: string): string {
  const input = `${query.toLowerCase().trim()}:${model}:${extra || ''}`;
  return `pplx:${createHash('md5').update(input).digest('hex')}`;
}

export function getFromCache(key: string): SearchResult | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    console.log(`[Perplexity] Cache HIT`);
    return entry.data;
  }
  if (entry) cache.delete(key);
  return null;
}

export function setCache(key: string, data: SearchResult, ttl: number = CACHE_TTL): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
  console.log(`[Perplexity] Cached result, TTL: ${ttl / 1000 / 60}min`);
}

export function getCacheStats(): { size: number; estimatedSavings: number } {
  return {
    size: cache.size,
    estimatedSavings: cache.size * 0.01 // ~$0.01 per cached query
  };
}

export function clearCache(): void {
  cache.clear();
  console.log('[Perplexity] Cache cleared');
}

export function getCacheInstance(): Map<string, { data: SearchResult; expiresAt: number }> {
  return cache;
}
