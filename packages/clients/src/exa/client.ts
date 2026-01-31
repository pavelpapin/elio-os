/**
 * Exa.ai API Client
 * Handles authentication, caching, and API requests
 */

import { paths } from '@elio/shared';
import { ConnectorCache, getApiKey } from '../utils/index.js';

const API_BASE = 'https://api.exa.ai';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Shared cache instance
export const cache = new ConnectorCache<unknown>('exa', CACHE_TTL);

/**
 * Get API key from credentials
 */
export function getExaApiKey(): string | null {
  return getApiKey('exa.json');
}

/**
 * Check if Exa is configured
 */
export function isAuthenticated(): boolean {
  return getExaApiKey() !== null;
}

/**
 * Make authenticated request to Exa API
 */
export async function apiRequest<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const apiKey = getExaApiKey();
  if (!apiKey) {
    throw new Error(
      `Exa API not configured. Add api_key to ${paths.credentials.exa}`
    );
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Exa API error ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Get cache stats
 */
export function getCacheStats(): { size: number } {
  return cache.stats();
}

/**
 * Clear cache
 */
export function clearCache(): void {
  cache.clear();
}
