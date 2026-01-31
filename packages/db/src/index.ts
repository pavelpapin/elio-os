/**
 * @elio/db - Database Layer for Elio OS
 *
 * Provides Supabase-backed repositories for all system entities.
 */

import { getClient, resetClient, ensureConnection } from './client.js';
import { createRepositories, Repositories } from './repositories/index.js';
import { Cache } from './cache.js';
import { createLogger } from '@elio/shared';

// Re-export everything
export * from './client.js';
export * from './cache.js';
export * from './errors.js';
export * from './repositories/index.js';
export * from './factory.js';

const logger = createLogger('db');

/**
 * Database facade - main entry point
 */
export class Database {
  private _repos: Repositories | null = null;
  private _cache: Cache;

  constructor(cache?: Cache) {
    this._cache = cache || new Cache();
  }

  private get repos(): Repositories {
    if (!this._repos) {
      const client = getClient();
      if (!client) {
        throw new Error('Supabase client not initialized. Check credentials.');
      }
      this._repos = createRepositories(client);
    }
    return this._repos;
  }

  get cache(): Cache {
    return this._cache;
  }

  // Convenience accessors
  get workflow() { return this.repos.workflow; }
  get schedule() { return this.repos.schedule; }
  get message() { return this.repos.message; }
  get task() { return this.repos.task; }
  get person() { return this.repos.person; }
  get audit() { return this.repos.audit; }
  get state() { return this.repos.state; }
  get backlog() { return this.repos.backlog; }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await ensureConnection();
      if (!client) return false;

      const { error } = await client
        .from('system_state')
        .select('key')
        .limit(1);

      if (error) {
        logger.warn('Health check query failed, resetting client', { error: error.message });
        this._repos = null;
        resetClient();
        return false;
      }

      return true;
    } catch {
      this._repos = null;
      resetClient();
      return false;
    }
  }

  async reconnect(): Promise<boolean> {
    this._repos = null;
    resetClient();
    return this.healthCheck();
  }

  invalidateCache(pattern?: string): void {
    if (pattern) {
      this._cache.invalidatePattern(pattern);
    } else {
      this._cache.clear();
    }
  }

  reset(): void {
    this._repos = null;
    resetClient();
    logger.info('Database layer reset');
  }
}

// Singleton instance
let db: Database | null = null;

/**
 * Get singleton Database instance.
 * For DI-friendly usage, see createDatabase() in factory.ts.
 */
export function getDb(): Database {
  if (!db) {
    db = new Database();
  }
  return db;
}

/**
 * Reset singleton instance (for testing or reconnection)
 */
export function resetDb(): void {
  if (db) {
    db.reset();
    db.cache.destroy();
  }
  db = null;
}
