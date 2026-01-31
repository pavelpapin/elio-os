/**
 * LinkedIn Scraper
 * Priority: OAuth API > Scrape.do > Jina Reader
 */

import * as scrapedo from '../scrapedo/index.js';
import * as oauth from './oauth.js';
import { getCacheKey, getFromCache, setCache, getCacheStats, clearCache } from './cache.js';
import { createLogger } from '@elio/shared';

const log = createLogger('LinkedIn');
import {
  normalizeLinkedInUrl,
  extractLocation,
  parseGoogleResults,
  parseLinkedInHtml,
  parseLinkedInContent
} from './parsers.js';
import type { ScrapedProfile, ScraperSearchResult, FindPersonContext } from './types.js';

// Re-export types and cache functions
export type { ScrapedProfile, ScraperSearchResult, FindPersonContext };
export { getCacheStats, clearCache };

/**
 * Get current authenticated user's profile via OAuth API
 */
export async function getMyProfile(): Promise<ScrapedProfile | null> {
  if (!oauth.isAuthenticated()) {
    log.info('Not authenticated, use startAuth() first');
    return null;
  }

  const apiProfile = await oauth.getMyProfile();
  if (!apiProfile) return null;

  return {
    name: apiProfile.name,
    profileUrl: `https://www.linkedin.com/in/${apiProfile.id}/`,
    photoUrl: apiProfile.picture,
    email: apiProfile.email,
    source: 'api'
  };
}

/**
 * Start LinkedIn OAuth flow
 */
export function startAuth(): { authUrl: string; status: string } {
  const status = oauth.getAuthStatus();
  if (status.authenticated) {
    return { authUrl: '', status: 'Already authenticated' };
  }
  return {
    authUrl: status.authUrl || oauth.getAuthUrl(),
    status: 'Open URL to authenticate'
  };
}

/**
 * Exchange OAuth code for token
 */
export async function completeAuth(code: string): Promise<boolean> {
  try {
    await oauth.exchangeCode(code);
    return true;
  } catch (error) {
    log.error('Auth failed', { error });
    return false;
  }
}

/**
 * Get LinkedIn auth status
 */
export function getAuthStatus() {
  return oauth.getAuthStatus();
}

/**
 * Search for LinkedIn profiles using Google via Scrape.do
 */
export async function searchProfiles(
  query: string,
  options: { limit?: number } = {}
): Promise<ScraperSearchResult[]> {
  const limit = options.limit || 10;
  const searchQuery = `site:linkedin.com/in ${query}`;

  try {
    if (scrapedo.isAuthenticated()) {
      const result = await scrapedo.scrapeGoogle(searchQuery, { num: limit });
      if (result.success) {
        return parseGoogleResults(result.content);
      }
    }

    // Fallback to DuckDuckGo
    const { duckduckgoSearch } = await import('@elio/clients/webscraping');
    const results = await duckduckgoSearch(searchQuery, limit);

    return results
      .filter((r: { url: string }) => r.url.includes('linkedin.com/in/'))
      .map((r: { url: string; title: string; snippet: string }) => {
        const titleParts = r.title.replace(' | LinkedIn', '').split(' - ');
        return {
          name: titleParts[0]?.trim() || 'Unknown',
          headline: titleParts[1]?.trim(),
          profileUrl: r.url,
          location: extractLocation(r.snippet)
        };
      });
  } catch (error) {
    log.error('Search error', { error });
    return [];
  }
}

/**
 * Get LinkedIn profile - uses Scrape.do for reliable access
 */
export async function getProfile(profileUrl: string): Promise<ScrapedProfile | null> {
  const normalizedUrl = normalizeLinkedInUrl(profileUrl);
  if (!normalizedUrl) {
    throw new Error('Invalid LinkedIn URL');
  }

  const cacheKey = getCacheKey(normalizedUrl);

  // Check cache
  const cached = getFromCache(cacheKey);
  if (cached) {
    log.debug('Cache HIT', { url: normalizedUrl });
    return cached;
  }

  // Try Scrape.do first
  if (scrapedo.isAuthenticated()) {
    log.info('Fetching via Scrape.do', { url: normalizedUrl });
    const result = await scrapedo.scrapeLinkedIn(normalizedUrl);

    if (result.success && result.content.length > 1000) {
      const profile = parseLinkedInHtml(result.content, normalizedUrl, 'scrapedo');
      setCache(cacheKey, profile);
      return profile;
    }
    log.info('Scrape.do failed or empty, trying Jina');
  }

  // Fallback to Jina Reader
  log.info('Fetching via Jina', { url: normalizedUrl });
  try {
    const { jinaReader } = await import('@elio/clients/webscraping');
    const result = await jinaReader(normalizedUrl);

    if (!result.success) {
      log.error('Jina failed', { error: result.error });
      return null;
    }

    const profile = parseLinkedInContent(result.content, normalizedUrl);
    setCache(cacheKey, profile);
    return profile;
  } catch (error) {
    log.error('All methods failed', { error });
    return null;
  }
}

/**
 * Search and get profile in one call
 */
export async function findPerson(
  name: string,
  context?: FindPersonContext
): Promise<ScrapedProfile | null> {
  let query = name;
  if (context?.company) query += ` ${context.company}`;
  if (context?.title) query += ` ${context.title}`;
  if (context?.location) query += ` ${context.location}`;

  const results = await searchProfiles(query, { limit: 5 });

  if (results.length === 0) {
    return null;
  }

  return getProfile(results[0].profileUrl);
}
