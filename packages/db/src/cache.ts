/**
 * Cache Layer
 * In-memory cache with TTL support
 */

import { createLogger } from '@elio/shared';

const logger = createLogger('db:cache');

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class Cache {
  private store = new Map<string, CacheEntry<unknown>>();
  private defaultTtlMs: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(defaultTtlMs = 60000, autoCleanupMs = 300000) {
    this.defaultTtlMs = defaultTtlMs;

    if (autoCleanupMs > 0) {
      this.cleanupInterval = setInterval(() => {
        const cleaned = this.cleanup();
        if (cleaned > 0) {
          logger.debug(`Auto-cleaned ${cleaned} expired cache entries`);
        }
      }, autoCleanupMs);

      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }

  invalidatePattern(pattern: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  cleanup(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        count++;
      }
    }

    return count;
  }

  stats(): { size: number; keys: string[] } {
    this.cleanup();
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys())
    };
  }
}

// Cache key builders
export const cacheKeys = {
  workflow: (id: string) => `workflow:${id}`,
  workflowStats: (since: string) => `workflow:stats:${since}`,
  schedule: (id: string) => `schedule:${id}`,
  scheduleDue: () => 'schedule:due',
  task: (id: string) => `task:${id}`,
  taskStats: () => 'task:stats',
  person: (id: string) => `person:${id}`,
  personByEmail: (email: string) => `person:email:${email}`,
  state: (key: string) => `state:${key}`,
  message: (id: string) => `message:${id}`,
  unprocessedCount: (source?: string) => `message:unprocessed:${source || 'all'}`
};
