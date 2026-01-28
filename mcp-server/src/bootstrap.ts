/**
 * Bootstrap - Application Initialization
 *
 * Sets up the DI container with all services.
 * Single source of truth for service configuration.
 */

import { existsSync, readFileSync } from 'fs';
import { createLogger, paths } from '@elio/shared';
import { createDatabase, type DatabaseInstance, type SupabaseCredentials, Cache } from '@elio/db';

import { PolicyEngine } from './gateway/policy.js';
import { AuditLogger } from './gateway/audit.js';
import { ToolRegistry } from './gateway/registry.js';
import { Container } from './bootstrap-container.js';

const logger = createLogger('bootstrap');

/**
 * All services available via DI
 */
export interface ServiceRegistry {
  logger: ReturnType<typeof createLogger>;
  cache: Cache;
  database: DatabaseInstance;
  policyEngine: PolicyEngine;
  auditLogger: AuditLogger;
  toolRegistry: ToolRegistry;
}

let container: Container | null = null;
let bootstrapped = false;

function loadSupabaseCredentials(): SupabaseCredentials | null {
  const credPath = paths.credentials.supabase;
  if (!existsSync(credPath)) {
    logger.warn(`Supabase credentials not found at ${credPath}`);
    return null;
  }

  try {
    const content = readFileSync(credPath, 'utf-8');
    return JSON.parse(content) as SupabaseCredentials;
  } catch (error) {
    logger.error('Failed to load Supabase credentials', { error });
    return null;
  }
}

/**
 * Bootstrap the application
 */
export function bootstrap(): void {
  if (bootstrapped) {
    logger.warn('Already bootstrapped');
    return;
  }

  logger.info('Starting application bootstrap...');
  container = new Container();

  container.register('logger', () => createLogger('app'));
  container.register('cache', () => new Cache());

  const supabaseCreds = loadSupabaseCredentials();
  if (supabaseCreds) {
    container.register('database', (services) =>
      createDatabase({ credentials: supabaseCreds, cache: services.cache })
    );
    logger.info('Database configured');
  } else {
    container.register('database', () => {
      throw new Error('Database not configured. Check Supabase credentials.');
    });
  }

  container.register('policyEngine', () => new PolicyEngine());
  container.register('auditLogger', () => new AuditLogger());
  container.register('toolRegistry', (services) =>
    new ToolRegistry(services.policyEngine!, services.auditLogger!)
  );

  logger.info('Gateway services configured');
  bootstrapped = true;
  logger.info('Bootstrap complete');
}

/**
 * Resolve a single service
 */
export function resolve<K extends keyof ServiceRegistry>(name: K): ServiceRegistry[K] {
  if (!container) {
    throw new Error('Application not bootstrapped. Call bootstrap() first.');
  }
  return container.resolve(name);
}

/**
 * Get all commonly used services
 */
export function getServices(): Pick<
  ServiceRegistry,
  'logger' | 'cache' | 'database' | 'toolRegistry' | 'policyEngine' | 'auditLogger'
> {
  return {
    logger: resolve('logger'),
    cache: resolve('cache'),
    database: resolve('database'),
    toolRegistry: resolve('toolRegistry'),
    policyEngine: resolve('policyEngine'),
    auditLogger: resolve('auditLogger'),
  };
}

export function isBootstrapped(): boolean {
  return bootstrapped;
}

export function resetBootstrap(): void {
  if (container) container.reset();
  container = null;
  bootstrapped = false;
  logger.info('Bootstrap reset');
}
