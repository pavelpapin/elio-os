/**
 * Semantic Scholar API Client
 */

import { ConnectorCache, getApiKey } from '../utils/index.js';

const API_BASE = 'https://api.semanticscholar.org/graph/v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const cache = new ConnectorCache<unknown>('s2', CACHE_TTL);

export const PAPER_FIELDS = [
  'paperId',
  'title',
  'abstract',
  'year',
  'citationCount',
  'influentialCitationCount',
  'url',
  'venue',
  'authors',
  'fieldsOfStudy',
  'publicationDate',
  'openAccessPdf',
  'tldr',
].join(',');

export const PAPER_FIELDS_SHORT = 'paperId,title,year,citationCount,authors,venue';

/**
 * Get API key (optional - works without it)
 */
function getS2ApiKey(): string | null {
  return getApiKey('semanticscholar.json');
}

/**
 * Get request headers
 */
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const apiKey = getS2ApiKey();
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  return headers;
}

/**
 * Make API request
 */
export async function apiRequest<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Semantic Scholar API error ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Check if API key is configured
 */
export function hasApiKey(): boolean {
  return getS2ApiKey() !== null;
}

/**
 * Always authenticated (works without key)
 */
export function isAuthenticated(): boolean {
  return true;
}

export function getCacheStats(): { size: number } {
  return cache.stats();
}

export function clearCache(): void {
  cache.clear();
}
