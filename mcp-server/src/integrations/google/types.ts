/**
 * Google Search Types
 * Type definitions for Google search integration
 */

export interface GoogleSearchResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
  domain: string;
  type?: 'organic' | 'featured' | 'video' | 'news' | 'image';
}

export interface GoogleSearchResponse {
  results: GoogleSearchResult[];
  totalResults?: number;
  cached: boolean;
  query: string;
  method: 'google-html' | 'serpapi-free' | 'duckduckgo';
}

export interface SearchOptions {
  num?: number;
  lang?: string;
  country?: string;
}

export interface DeepSearchOptions {
  num?: number;
  fetchContent?: boolean;
  maxContentUrls?: number;
}

export interface DeepSearchResult {
  results: GoogleSearchResult[];
  content?: Array<{ url: string; title: string; content: string }>;
}

export interface CacheEntry {
  data: GoogleSearchResult[];
  expiresAt: number;
}
