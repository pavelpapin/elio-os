/**
 * Exa.ai Type Definitions
 */

export interface ExaResult {
  url: string;
  id: string;
  title: string;
  score: number;
  publishedDate?: string;
  author?: string;
  text?: string;
  highlights?: string[];
  highlightScores?: number[];
  summary?: string;
}

export interface SearchResponse {
  results: ExaResult[];
  autopromptString?: string;
  cached: boolean;
}

export interface ContentsResponse {
  results: ExaResult[];
  cached: boolean;
}

export type SearchType = 'neural' | 'keyword' | 'auto';

export type Category =
  | 'company'
  | 'research paper'
  | 'news'
  | 'linkedin profile'
  | 'github'
  | 'tweet'
  | 'movie'
  | 'song'
  | 'personal site'
  | 'pdf';

export interface SearchOptions {
  type?: SearchType;
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  category?: Category;
  useAutoprompt?: boolean;
}

export interface SearchContentsOptions extends SearchOptions {
  text?: boolean | { maxCharacters?: number; includeHtmlTags?: boolean };
  highlights?: boolean | { numSentences?: number; highlightsPerUrl?: number };
  summary?: boolean | { query?: string };
}

export interface FindSimilarOptions {
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  excludeSourceDomain?: boolean;
  category?: Category;
}

export interface ContentsOptions {
  text?: boolean | { maxCharacters?: number };
  highlights?: boolean | { numSentences?: number };
  summary?: boolean | { query?: string };
}

export interface ResearchResult {
  results: ExaResult[];
  news?: ExaResult[];
  papers?: ExaResult[];
  summary: string;
  cached: boolean;
}
