/**
 * Perplexity Cache Module
 */

import { createHash } from 'crypto';
import { createLogger } from '@elio/shared';
import { SearchResult } from './types.js';

const logger = createLogger('perplexity');

// Cache with TTL
const cache = new Map<string, { data: SearchResult; expiresAt: number }>();

export const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours default
export const FACT_CHECK_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days for fact checks

export function getCacheKey(query: string, model: string, extra?: string): string {
  const input = `${query.toLowerCase().trim()}:${model}:${extra || ''}`;
  return `pplx:${createHash('md5').update(input).digest('hex')}`;
}

export function getFromCache(key: string): SearchResult | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    logger.debug('Cache HIT');
    return entry.data;
  }
  if (entry) cache.delete(key);
  return null;
}

export function setCache(key: string, data: SearchResult, ttl: number = CACHE_TTL): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
  logger.debug('Cached result', { ttlMinutes: ttl / 1000 / 60 });
}

export function getRawCache(): Map<string, { data: SearchResult; expiresAt: number }> {
  return cache;
}

export function getCacheStats(): { size: number; estimatedSavings: number } {
  return {
    size: cache.size,
    estimatedSavings: cache.size * 0.01 // ~$0.01 per cached query
  };
}

export function clearCache(): void {
  cache.clear();
  logger.info('Cache cleared');
}
