/**
 * Serper Client - Credentials, Cache, HTTP
 */

import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import * as https from 'https';
import { paths, createLogger } from '@elio/shared';

const logger = createLogger('clients:serper');
const CREDENTIALS_PATH = paths.credentials.serper;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const cache = new Map<string, { data: unknown; expiresAt: number }>();

export function getCacheKey(query: string, type: string): string {
  const hash = createHash('md5').update(query.toLowerCase().trim()).digest('hex');
  return `serper:${type}:${hash}`;
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

export function httpsPost<T>(path: string, body: Record<string, unknown>, apiKey: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'google.serper.dev',
      path,
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData) as T);
        } catch {
          reject(new Error('Invalid JSON response from Serper'));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
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
