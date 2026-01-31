/**
 * Web Search & Parser Functions
 */

import { callTool } from './client.js';
import type { SearchResult, ParsedPage, SitemapEntry } from './types.js';

export interface DuckDuckGoOptions {
  count?: number;
  timeout?: number;
}

export async function duckduckgoSearch(
  query: string,
  options: DuckDuckGoOptions = {}
): Promise<SearchResult[]> {
  const result = await callTool<{ results: SearchResult[] }>('duckduckgo_search', {
    query,
    count: options.count || 10,
    request_timeout: options.timeout || 300
  });
  return result.results || [];
}

export interface ParseWebpageOptions {
  include_tags?: string[];
  exclude_tags?: string[];
  only_main_content?: boolean;
  extract_contacts?: boolean;
  social_links_only?: boolean;
  timeout?: number;
}

export async function parseWebpage(
  url: string,
  options: ParseWebpageOptions = {}
): Promise<ParsedPage> {
  return callTool<ParsedPage>('parse_webpage', {
    url,
    include_tags: options.include_tags,
    exclude_tags: options.exclude_tags,
    only_main_content: options.only_main_content ?? true,
    extract_contacts: options.extract_contacts,
    social_links_only: options.social_links_only,
    request_timeout: options.timeout || 300
  });
}

export interface GetSitemapOptions {
  include_patterns?: string[];
  exclude_patterns?: string[];
  same_host_only?: boolean;
  respect_robots?: boolean;
  count?: number;
  timeout?: number;
}

export async function getSitemap(
  url: string,
  options: GetSitemapOptions = {}
): Promise<SitemapEntry[]> {
  const result = await callTool<{ urls: SitemapEntry[] }>('get_sitemap', {
    url,
    include_patterns: options.include_patterns,
    exclude_patterns: options.exclude_patterns,
    same_host_only: options.same_host_only,
    respect_robots: options.respect_robots,
    count: options.count,
    request_timeout: options.timeout || 300
  });
  return result.urls || [];
}
