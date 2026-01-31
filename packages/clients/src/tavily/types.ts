/**
 * Tavily Types
 */

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

export interface TavilySearchResponse {
  query: string;
  answer?: string;
  results: TavilyResult[];
  cached: boolean;
  response_time?: number;
}

export type SearchDepth = 'basic' | 'advanced';
export type Topic = 'general' | 'news';
