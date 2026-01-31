/**
 * Unified Credentials Utility
 * Combines API key and OAuth credential loading
 */

import { promises as fs, existsSync, readFileSync } from 'fs';
import { paths, createLogger } from '@elio/shared';

const logger = createLogger('credentials');
const SECRETS_DIR = paths.secrets;

// ===== Credential Types =====

export interface GoogleToken {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export interface TelegramCredentials {
  bot_token: string;
  default_chat_id?: string;
}

export interface SlackCredentials {
  bot_token: string;
  default_channel?: string;
}

export interface NotionCredentials {
  api_key: string;
}

export interface PerplexityCredentials {
  api_key: string;
}

export interface LinkedInCredentials {
  li_at?: string;           // LinkedIn session cookie
  jsessionid?: string;      // JSESSIONID cookie
  rapidapi_key?: string;    // RapidAPI key for LinkedIn API
  proxycurl_key?: string;   // Proxycurl API key
}

export interface N8nCredentials {
  base_url: string;
  api_key?: string;
}

// ===== Generic Loaders =====

/**
 * Load credentials from a JSON file synchronously (for init)
 */
export function loadCredentialsSync<T>(filename: string): T | null {
  const path = `${SECRETS_DIR}/${filename}`;
  if (!existsSync(path)) {
    return null;
  }
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    logger.error(`Failed to parse credentials: ${filename}`, { error });
    return null;
  }
}

/**
 * Load credentials from a JSON file asynchronously
 */
export async function loadCredentials<T>(filename: string): Promise<T | null> {
  const path = `${SECRETS_DIR}/${filename}`;
  try {
    const content = await fs.readFile(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Check if credentials file exists
 */
export function hasCredentials(filename: string): boolean {
  return existsSync(`${SECRETS_DIR}/${filename}`);
}

// Alias for backwards compatibility
export const credentialsExist = hasCredentials;

/**
 * Get API key from credentials file
 * Handles common patterns: api_key, apiKey, token, access_token, bearer_token
 */
export function getApiKey(filename: string): string | null {
  const creds = loadCredentialsSync<Record<string, string>>(filename);
  if (!creds) return null;

  return creds.api_key
    || creds.apiKey
    || creds.token
    || creds.access_token
    || creds.bearer_token
    || null;
}

// ===== Service-Specific Loaders =====

/**
 * Get Google token
 */
export function getGoogleToken(): GoogleToken | null {
  return loadCredentialsSync<GoogleToken>('google-token.json');
}

/**
 * Check if Google is authenticated
 */
export function isGoogleAuthenticated(): boolean {
  return hasCredentials('google-token.json');
}

/**
 * Get Telegram credentials
 */
export function getTelegramCredentials(): TelegramCredentials | null {
  return loadCredentialsSync<TelegramCredentials>('telegram.json');
}

/**
 * Get Slack credentials
 */
export function getSlackCredentials(): SlackCredentials | null {
  return loadCredentialsSync<SlackCredentials>('slack.json');
}

/**
 * Get Notion credentials
 */
export function getNotionCredentials(): NotionCredentials | null {
  return loadCredentialsSync<NotionCredentials>('notion.json');
}

/**
 * Get Perplexity credentials
 */
export function getPerplexityCredentials(): PerplexityCredentials | null {
  return loadCredentialsSync<PerplexityCredentials>('perplexity.json');
}

/**
 * Get LinkedIn credentials
 */
export function getLinkedInCredentials(): LinkedInCredentials | null {
  return loadCredentialsSync<LinkedInCredentials>('linkedin.json');
}

/**
 * Get n8n credentials
 */
export function getN8nCredentials(): N8nCredentials | null {
  return loadCredentialsSync<N8nCredentials>('n8n.json');
}
