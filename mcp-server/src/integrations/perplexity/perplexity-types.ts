/**
 * Perplexity API type definitions and constants
 */

import type {
  SearchResult,
  SearchOptions,
  ResearchOptions,
  FactCheckResult,
  PerplexityModel
} from './types.js';

// Cache TTL constants
export const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours default
export const FACT_CHECK_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days for fact checks
export const NEWS_TTL = 6 * 60 * 60 * 1000; // 6 hours for news

// Re-export types
export type {
  SearchResult,
  SearchOptions,
  ResearchOptions,
  FactCheckResult,
  PerplexityModel
};
