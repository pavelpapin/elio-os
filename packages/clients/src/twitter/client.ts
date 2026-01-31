/**
 * Twitter/X API Client
 */

import { ConnectorCache, getApiKey } from '../utils/index.js';

const BASE_URL = 'https://api.twitter.com/2';
const CACHE_TTL = 15 * 60 * 1000;

export const cache = new ConnectorCache<unknown>('twitter', CACHE_TTL);

let apiCreditsExhausted = false;

/**
 * Get bearer token
 */
export function getBearerToken(): string | null {
  return getApiKey('twitter.json');
}

/**
 * Check if API credits are exhausted
 */
export function isApiExhausted(): boolean {
  return apiCreditsExhausted;
}

/**
 * Mark API as exhausted
 */
export function setApiExhausted(value: boolean): void {
  apiCreditsExhausted = value;
}

/**
 * Make authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  params: URLSearchParams
): Promise<T> {
  const token = getBearerToken();
  if (!token) {
    throw new Error('Twitter API not configured');
  }

  const response = await fetch(`${BASE_URL}${endpoint}?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 402) {
    apiCreditsExhausted = true;
    throw new Error('API_CREDITS_EXHAUSTED');
  }

  if (!response.ok) {
    throw new Error(`Twitter API error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function isAuthenticated(): boolean {
  return true; // DuckDuckGo fallback always available
}

export function getStatus() {
  return {
    api: getBearerToken() !== null,
    fallback: 'duckduckgo',
    creditsExhausted: apiCreditsExhausted,
  };
}

export function resetCreditsFlag(): void {
  apiCreditsExhausted = false;
}

export function getCacheStats(): { size: number } {
  return cache.stats();
}

export function clearCache(): void {
  cache.clear();
}
