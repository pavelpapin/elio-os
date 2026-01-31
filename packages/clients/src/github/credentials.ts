/**
 * GitHub Connector Credentials
 */

import { readFileSync, existsSync } from 'fs';
import { paths, createLogger } from '@elio/shared';

const logger = createLogger('github');
const CREDENTIALS_PATH = paths?.secrets
  ? `${paths.secrets}/github.json`
  : '/root/.claude/secrets/github.json';

export const API_BASE = 'https://api.github.com';

export function getToken(): string | null {
  if (!existsSync(CREDENTIALS_PATH)) return null;
  try {
    const creds = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8'));
    return creds.token || creds.access_token || null;
  } catch (error) {
    logger.error('Failed to parse credentials', { error: String(error) });
    return null;
  }
}

export function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

export function hasToken(): boolean {
  return getToken() !== null;
}

export { logger };
