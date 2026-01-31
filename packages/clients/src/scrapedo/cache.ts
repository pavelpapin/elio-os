/**
 * Scrape.do - Cache and Credentials
 */

import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { createLogger } from '@elio/shared';

export const log = createLogger('Scrape.do');

const CREDENTIALS_PATH = '/root/.claude/secrets/scrapedo.json';

const cache = new Map<string, { data: string; expiresAt: number }>();
export const CACHE_TTL = 24 * 60 * 60 * 1000;

export function getCredentials(): { api_key: string } | null {
  if (!existsSync(CREDENTIALS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

export function getCacheKey(url: string, options?: string): string {
  const input = `${url}:${options || ''}`;
  return `scrapedo:${createHash('md5').update(input).digest('hex')}`;
}

export function getFromCache(key: string): string | null {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  return null;
}

export function setCache(key: string, data: string, ttl: number = CACHE_TTL): void {
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
