/**
 * Community Cache Utility
 */

import { ConnectorCache } from '../utils/index.js';

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export const cache = new ConnectorCache<unknown>('community', CACHE_TTL);

export function getCacheStats(): { size: number } {
  return cache.stats();
}

export function clearCache(): void {
  cache.clear();
}
