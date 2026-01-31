/**
 * Brave Search - Cache and HTTP Utilities
 */

import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import * as https from 'https';
import { paths, createLogger } from '@elio/shared';

export const logger = createLogger('clients:brave');
export const CREDENTIALS_PATH = paths.credentials.brave;
export const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

const cache = new Map<string, { data: unknown; expiresAt: number }>();

export function getCacheKey(query: string, type: string): string {
  const hash = createHash('md5').update(query.toLowerCase().trim()).digest('hex');
  return `brave:${type}:${hash}`;
}

export function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data as T;
  }
  if (entry) cache.delete(key);
  return null;
}

export function setCache(key: string, data: unknown, ttl: number = CACHE_TTL): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

export function getCredentials(): { api_key: string } | null {
  if (!existsSync(CREDENTIALS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8'));
  } catch (error) {
    logger.error('Failed to parse credentials', { error });
    return null;
  }
}

export function httpsRequest<T>(options: {
  hostname: string;
  path: string;
  method: string;
  headers: Record<string, string>;
}): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data) as T);
        } catch {
          reject(new Error('Invalid JSON response'));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
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
