/**
 * Database Factory
 *
 * DI-friendly factory functions for creating database instances.
 * Use these instead of getDb() singleton for new code.
 *
 * @example
 * // In bootstrap.ts
 * import { createDatabase } from '@elio/db/factory';
 *
 * const db = createDatabase({
 *   credentials: loadCredentials(),
 * });
 *
 * container.register('database', () => db);
 *
 * // In services
 * constructor(private db: DatabaseInstance) {}
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Cache } from './cache.js';
import { createRepositories, Repositories } from './repositories/index.js';

// =============================================================================
// Types
// =============================================================================

export interface SupabaseCredentials {
  url: string;
  anon_key: string;
  service_role_key?: string;
}

export interface DatabaseConfig {
  /** Supabase credentials */
  credentials: SupabaseCredentials;

  /** Optional cache instance */
  cache?: Cache;

  /** Cache TTL in ms (default: 5 minutes) */
  cacheTtlMs?: number;
}

/**
 * Database instance interface
 * Compatible with the Database class but created via factory
 */
export interface DatabaseInstance {
  readonly cache: Cache;
  readonly workflow: Repositories['workflow'];
  readonly schedule: Repositories['schedule'];
  readonly message: Repositories['message'];
  readonly task: Repositories['task'];
  readonly person: Repositories['person'];
  readonly audit: Repositories['audit'];
  readonly state: Repositories['state'];
  readonly backlog: Repositories['backlog'];
  healthCheck(): Promise<boolean>;
  invalidateCache(pattern?: string): void;
  reset(): void;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a Supabase client instance
 * Use this when you need direct access to Supabase
 */
export function createSupabaseClient(credentials: SupabaseCredentials): SupabaseClient {
  const key = credentials.service_role_key || credentials.anon_key;

  return createClient(credentials.url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create repositories from a Supabase client
 */
export function createRepositoriesFromClient(client: SupabaseClient): Repositories {
  return createRepositories(client);
}

/**
 * Create a Database instance with explicit dependencies
 *
 * This is the recommended way to create a Database for DI containers.
 *
 * @example
 * const db = createDatabase({
 *   credentials: { url: '...', anon_key: '...' },
 *   cache: new Cache(),
 * });
 */
export function createDatabase(config: DatabaseConfig): DatabaseInstance {
  const { credentials, cache = new Cache() } = config;

  // Create the Supabase client
  const client = createSupabaseClient(credentials);

  // Create repositories
  let repos: Repositories | null = null;

  const getRepos = (): Repositories => {
    if (!repos) {
      repos = createRepositories(client);
    }
    return repos;
  };

  // Return the database instance
  return {
    cache,

    get workflow() { return getRepos().workflow; },
    get schedule() { return getRepos().schedule; },
    get message() { return getRepos().message; },
    get task() { return getRepos().task; },
    get person() { return getRepos().person; },
    get audit() { return getRepos().audit; },
    get state() { return getRepos().state; },
    get backlog() { return getRepos().backlog; },

    async healthCheck(): Promise<boolean> {
      try {
        const { error } = await client
          .from('system_state')
          .select('key')
          .limit(1);
        return !error;
      } catch {
        return false;
      }
    },

    invalidateCache(pattern?: string): void {
      if (pattern) {
        cache.invalidatePattern(pattern);
      } else {
        cache.clear();
      }
    },

    reset(): void {
      repos = null;
    },
  };
}

// =============================================================================
// Container Module Helper
// =============================================================================

/**
 * Create a container registration module for Database
 *
 * @example
 * import { createDatabaseModule } from '@elio/db/factory';
 *
 * const dbModule = createDatabaseModule({ credentials: loadCreds() });
 * // Access via dbModule.database or individual repos
 * dbModule.database.workflow.find(...)
 */
export function createDatabaseModule(config: DatabaseConfig) {
  const db = createDatabase(config);

  return {
    database: db,

    // Repository shortcuts for direct container registration
    workflowRepo: db.workflow,
    scheduleRepo: db.schedule,
    messageRepo: db.message,
    taskRepo: db.task,
    personRepo: db.person,
    auditRepo: db.audit,
    stateRepo: db.state,
    backlogRepo: db.backlog,
  };
}
