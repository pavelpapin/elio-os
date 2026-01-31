/**
 * Supabase Client
 * Database client with lazy initialization
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { paths, createLogger } from '@elio/shared';

const logger = createLogger('db:client');

interface SupabaseCredentials {
  url: string;
  anon_key: string;
  service_role_key?: string;
}

let client: SupabaseClient | null = null;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL_MS = 60_000;

function loadCredentials(): SupabaseCredentials | null {
  const credPath = paths.credentials.supabase;
  if (!existsSync(credPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(credPath, 'utf-8'));
  } catch {
    logger.error('Failed to parse Supabase credentials');
    return null;
  }
}

/**
 * Get Supabase client (singleton)
 */
export function getClient(): SupabaseClient | null {
  if (client) return client;

  const creds = loadCredentials();
  if (!creds) {
    logger.warn('Supabase not configured');
    return null;
  }

  // SECURITY: Always use anon_key for application access.
  // service_role_key bypasses RLS — reserve for migrations only.
  if (creds.service_role_key && !creds.anon_key) {
    logger.warn('Only service_role_key found — RLS will be bypassed. Set anon_key for safe application access.');
  }
  const key = creds.anon_key || creds.service_role_key;
  if (!key) {
    logger.error('No Supabase API key configured');
    return null;
  }

  client = createClient(creds.url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  logger.info('Supabase client initialized');
  return client;
}

/**
 * Check if Supabase is configured
 */
export function isConfigured(): boolean {
  return loadCredentials() !== null;
}

/**
 * Verify connection is alive, reconnect if needed.
 * Checks at most once per HEALTH_CHECK_INTERVAL_MS.
 */
export async function ensureConnection(): Promise<SupabaseClient | null> {
  const now = Date.now();
  if (!client || now - lastHealthCheck < HEALTH_CHECK_INTERVAL_MS) {
    return getClient();
  }

  try {
    const { error } = await client
      .from('system_state')
      .select('key')
      .limit(1);

    if (error) {
      logger.warn('Connection check failed, reconnecting', { error: error.message });
      client = null;
      return getClient();
    }

    lastHealthCheck = now;
    return client;
  } catch (err) {
    logger.warn('Connection lost, reconnecting', { error: String(err) });
    client = null;
    return getClient();
  }
}

/**
 * Reset client (for testing or reconnection)
 */
export function resetClient(): void {
  client = null;
  lastHealthCheck = 0;
}

/**
 * Get auth setup instructions
 */
export function getSetupInstructions(): string {
  return `
Supabase Setup:
1. Create project at https://supabase.com
2. Go to Project Settings > API
3. Create ${paths.credentials.supabase} with:
{
  "url": "https://your-project.supabase.co",
  "anon_key": "your-anon-key",
  "service_role_key": "your-service-role-key"
}
4. Run migrations to create tables
`;
}
