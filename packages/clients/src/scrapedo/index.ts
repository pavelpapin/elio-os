/**
 * Scrape.do Integration
 * Premium proxy scraper that bypasses blocks (LinkedIn, Google, etc.)
 * https://scrape.do
 */

import {
  log, CACHE_TTL, getCredentials, getCacheKey, getFromCache, setCache,
  isAuthenticated, getCacheStats, clearCache
} from './cache.js';

export { isAuthenticated, getCacheStats, clearCache } from './cache.js';

const BASE_URL = 'https://api.scrape.do';

export interface ScrapeOptions {
  render?: boolean;
  residential?: boolean;
  geoCode?: string;
  waitSelector?: string;
  headers?: Record<string, string>;
  returnJson?: boolean;
  cacheTtl?: number;
  noCache?: boolean;
}

export interface ScrapeResult {
  success: boolean;
  url: string;
  content: string;
  statusCode?: number;
  cached: boolean;
  error?: string;
}

export async function scrape(
  url: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error('Scrape.do not configured. Add api_key to /root/.claude/secrets/scrapedo.json');
  }

  const cacheKey = getCacheKey(url, JSON.stringify(options));
  const cacheTtl = options.cacheTtl || CACHE_TTL;

  if (!options.noCache) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      log.debug('Cache HIT', { url: url.slice(0, 50) });
      return { success: true, url, content: cached, cached: true };
    }
  }

  log.info('Fetching', { url: url.slice(0, 80) });

  const params = new URLSearchParams({ token: creds.api_key, url });
  if (options.render) params.set('render', 'true');
  if (options.residential) params.set('residential', 'true');
  if (options.geoCode) params.set('geoCode', options.geoCode);
  if (options.waitSelector) params.set('waitSelector', options.waitSelector);

  try {
    const response = await fetch(`${BASE_URL}/?${params}`, {
      method: 'GET',
      headers: options.headers || {}
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error('HTTP Error', { status: response.status, text: errorText.slice(0, 200) });
      return {
        success: false, url, content: '', statusCode: response.status,
        cached: false, error: `HTTP ${response.status}: ${errorText.slice(0, 100)}`
      };
    }

    const content = options.returnJson
      ? JSON.stringify(await response.json())
      : await response.text();

    setCache(cacheKey, content, cacheTtl);
    return { success: true, url, content, statusCode: response.status, cached: false };
  } catch (error) {
    log.error('Fetch error', { error });
    return {
      success: false, url, content: '', cached: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function scrapeLinkedIn(profileUrl: string): Promise<ScrapeResult> {
  let url = profileUrl;
  if (!url.startsWith('http')) {
    url = 'https://www.linkedin.com/in/' + url.replace(/^\/+/, '');
  }
  return scrape(url, {
    render: true, residential: true, geoCode: 'us',
    cacheTtl: 30 * 24 * 60 * 60 * 1000
  });
}

export async function scrapeGoogle(
  query: string,
  options: { num?: number; lang?: string } = {}
): Promise<ScrapeResult> {
  const params = new URLSearchParams({
    q: query, num: String(options.num || 10), hl: options.lang || 'en'
  });
  return scrape(`https://www.google.com/search?${params}`, {
    render: false, geoCode: 'us', cacheTtl: 7 * 24 * 60 * 60 * 1000
  });
}

export async function scrapeWithJs(
  url: string,
  waitSelector?: string
): Promise<ScrapeResult> {
  return scrape(url, { render: true, waitSelector, residential: true });
}
