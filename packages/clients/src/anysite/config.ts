/**
 * AnySite MCP Client Configuration
 */

import { readFileSync, existsSync } from 'fs';

const CREDENTIALS_PATH = '/root/.claude/secrets/anysite.json';

export interface AnySiteConfig {
  api_key: string;
  base_url: string;
}

let cachedConfig: AnySiteConfig | null = null;

export function getConfig(): AnySiteConfig | null {
  if (cachedConfig) return cachedConfig;

  if (!existsSync(CREDENTIALS_PATH)) return null;

  try {
    const creds = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8'));
    cachedConfig = {
      api_key: creds.api_key,
      base_url: creds.base_url || 'https://mcp.anysite.io/mcp'
    };
    return cachedConfig;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getConfig() !== null;
}

export function getEndpointUrl(): string {
  const config = getConfig();
  if (!config) throw new Error('AnySite not configured');
  return `${config.base_url}?api_key=${config.api_key}`;
}
