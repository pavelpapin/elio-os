/**
 * Cache Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Cache, cacheKeys } from '../cache.ts';

describe('Cache', () => {
  let cache: Cache;

  beforeEach(() => {
    // Create cache with no auto-cleanup to avoid timer issues
    cache = new Cache(1000, 0);
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('get/set', () => {
    it('stores and retrieves a value', () => {
      cache.set('key', 'value');
      expect(cache.get('key')).toBe('value');
    });

    it('stores complex objects', () => {
      const obj = { name: 'test', count: 42, nested: { a: 1 } };
      cache.set('obj', obj);
      expect(cache.get('obj')).toEqual(obj);
    });

    it('returns null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('expires entries after TTL', async () => {
      cache.set('expires', 'value', 10); // 10ms TTL
      expect(cache.get('expires')).toBe('value');

      await new Promise((r) => setTimeout(r, 20));
      expect(cache.get('expires')).toBeNull();
    });
  });

  describe('has()', () => {
    it('returns true for existing non-expired keys', () => {
      cache.set('key', 'value');
      expect(cache.has('key')).toBe(true);
    });

    it('returns false for non-existent keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('returns false for expired keys', async () => {
      cache.set('expires', 'value', 10);
      await new Promise((r) => setTimeout(r, 20));
      expect(cache.has('expires')).toBe(false);
    });
  });

  describe('delete()', () => {
    it('removes a key', () => {
      cache.set('key', 'value');
      cache.delete('key');
      expect(cache.get('key')).toBeNull();
    });

    it('does nothing for non-existent keys', () => {
      expect(() => cache.delete('nonexistent')).not.toThrow();
    });
  });

  describe('clear()', () => {
    it('removes all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.clear();
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });
  });

  describe('getOrSet()', () => {
    it('returns cached value if exists', async () => {
      cache.set('key', 'cached');
      const factory = vi.fn().mockResolvedValue('fresh');

      const result = await cache.getOrSet('key', factory);

      expect(result).toBe('cached');
      expect(factory).not.toHaveBeenCalled();
    });

    it('calls factory and caches if not exists', async () => {
      const factory = vi.fn().mockResolvedValue('fresh');

      const result = await cache.getOrSet('newkey', factory);

      expect(result).toBe('fresh');
      expect(factory).toHaveBeenCalledTimes(1);
      expect(cache.get('newkey')).toBe('fresh');
    });

    it('respects custom TTL', async () => {
      const factory = vi.fn().mockResolvedValue('value');
      await cache.getOrSet('key', factory, 10);

      await new Promise((r) => setTimeout(r, 20));
      expect(cache.get('key')).toBeNull();
    });
  });

  describe('invalidatePattern()', () => {
    it('removes keys matching pattern', () => {
      cache.set('user:1', 'a');
      cache.set('user:2', 'b');
      cache.set('post:1', 'c');

      const count = cache.invalidatePattern('user:');

      expect(count).toBe(2);
      expect(cache.get('user:1')).toBeNull();
      expect(cache.get('user:2')).toBeNull();
      expect(cache.get('post:1')).toBe('c');
    });

    it('returns 0 when no keys match', () => {
      cache.set('key', 'value');
      const count = cache.invalidatePattern('nomatch');
      expect(count).toBe(0);
    });
  });

  describe('cleanup()', () => {
    it('removes expired entries', async () => {
      cache.set('expires1', 'a', 10);
      cache.set('expires2', 'b', 10);
      cache.set('stays', 'c', 1000);

      await new Promise((r) => setTimeout(r, 20));
      const count = cache.cleanup();

      expect(count).toBe(2);
      expect(cache.get('stays')).toBe('c');
    });
  });

  describe('stats()', () => {
    it('returns cache statistics', () => {
      cache.set('key1', 'a');
      cache.set('key2', 'b');

      const stats = cache.stats();

      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });

    it('excludes expired entries', async () => {
      cache.set('expires', 'a', 10);
      cache.set('stays', 'b', 1000);

      await new Promise((r) => setTimeout(r, 20));
      const stats = cache.stats();

      expect(stats.size).toBe(1);
      expect(stats.keys).toEqual(['stays']);
    });
  });

  describe('destroy()', () => {
    it('clears the cache', () => {
      cache.set('key', 'value');
      cache.destroy();
      expect(cache.stats().size).toBe(0);
    });
  });
});

describe('cacheKeys', () => {
  it('builds workflow keys', () => {
    expect(cacheKeys.workflow('123')).toBe('workflow:123');
    expect(cacheKeys.workflowStats('2024-01-01')).toBe('workflow:stats:2024-01-01');
  });

  it('builds schedule keys', () => {
    expect(cacheKeys.schedule('abc')).toBe('schedule:abc');
    expect(cacheKeys.scheduleDue()).toBe('schedule:due');
  });

  it('builds task keys', () => {
    expect(cacheKeys.task('t1')).toBe('task:t1');
    expect(cacheKeys.taskStats()).toBe('task:stats');
  });

  it('builds person keys', () => {
    expect(cacheKeys.person('p1')).toBe('person:p1');
    expect(cacheKeys.personByEmail('test@example.com')).toBe('person:email:test@example.com');
  });

  it('builds state keys', () => {
    expect(cacheKeys.state('config')).toBe('state:config');
  });

  it('builds message keys', () => {
    expect(cacheKeys.message('m1')).toBe('message:m1');
    expect(cacheKeys.unprocessedCount()).toBe('message:unprocessed:all');
    expect(cacheKeys.unprocessedCount('telegram')).toBe('message:unprocessed:telegram');
  });
});
