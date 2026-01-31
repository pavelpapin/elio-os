/**
 * Shared Cache Utility for Connectors
 * Simple in-memory TTL cache
 */

import { createHash } from 'crypto';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class ConnectorCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private prefix: string;
  private defaultTtl: number;

  constructor(prefix: string, defaultTtlMs = 60 * 60 * 1000) {
    this.prefix = prefix;
    this.defaultTtl = defaultTtlMs;
  }

  key(query: string, type = 'default'): string {
    const hash = createHash('md5').update(query.toLowerCase().trim()).digest('hex');
    return `${this.prefix}:${type}:${hash}`;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs?: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtl)
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  stats(): { size: number } {
    return { size: this.store.size };
  }
}

/**
 * Create a cache key from multiple parts
 */
export function cacheKey(prefix: string, ...parts: string[]): string {
  const combined = parts.join(':').toLowerCase().trim();
  const hash = createHash('md5').update(combined).digest('hex');
  return `${prefix}:${hash}`;
}
