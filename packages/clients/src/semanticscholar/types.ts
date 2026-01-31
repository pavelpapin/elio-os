/**
 * Semantic Scholar Type Definitions
 */

export interface Paper {
  paperId: string;
  title: string;
  abstract?: string;
  year?: number;
  citationCount: number;
  influentialCitationCount?: number;
  url?: string;
  venue?: string;
  authors: Array<{
    authorId: string;
    name: string;
  }>;
  fieldsOfStudy?: string[];
  publicationDate?: string;
  openAccessPdf?: { url: string };
  tldr?: { text: string };
}

export interface Author {
  authorId: string;
  name: string;
  affiliations?: string[];
  paperCount?: number;
  citationCount?: number;
  hIndex?: number;
}

export interface SearchResponse {
  papers: Paper[];
  total: number;
  cached: boolean;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  year?: string;
  fieldsOfStudy?: string[];
  openAccessOnly?: boolean;
}

export interface CitationsResponse {
  citations: Paper[];
  total: number;
}

export interface ReferencesResponse {
  references: Paper[];
  total: number;
}

export interface ResearchResult {
  papers: Paper[];
  topAuthors: Array<{ name: string; paperCount: number }>;
  summary: string;
}
