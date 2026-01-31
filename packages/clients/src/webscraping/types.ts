/**
 * Web Scraping Types
 */

export interface JinaReaderResult {
  title: string;
  url: string;
  content: string;
  success: boolean;
  error?: string;
}

export interface DuckDuckGoResult {
  title: string;
  url: string;
  snippet: string;
}

export interface GoogleNewsResult {
  title: string;
  url: string;
  published: string;
  source: string;
}
