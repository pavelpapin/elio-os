/**
 * Serper Types
 */

export interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  position?: number;
  date?: string;
}

export interface SerperSearchResponse {
  results: SerperSearchResult[];
  cached: boolean;
  query: string;
}

export interface SerperNewsResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  source?: string;
  imageUrl?: string;
}

export interface SerperImageResult {
  title: string;
  imageUrl: string;
  link: string;
}
