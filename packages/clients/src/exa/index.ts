/**
 * Exa.ai Connector
 * Neural/semantic search - finds content by meaning, not just keywords
 *
 * Features:
 * - Semantic search (understands intent)
 * - Auto-summarization of results
 * - Content extraction
 * - Similar document finding
 *
 * Free tier: 1000 requests/month
 * https://exa.ai
 */

// Types
export type {
  ExaResult,
  SearchResponse,
  ContentsResponse,
  SearchType,
  Category,
  SearchOptions,
  SearchContentsOptions,
  FindSimilarOptions,
  ContentsOptions,
  ResearchResult,
} from './types.js';

// Client utilities
export {
  isAuthenticated,
  getCacheStats,
  clearCache,
} from './client.js';

// Search functions
export { search, searchAndContents } from './search.js';

// Content functions
export { findSimilar, getContents } from './contents.js';

// Research functions
export { researchTopic, findAuthoritativeSources } from './research.js';
