/**
 * Semantic Scholar Connector
 * Free academic paper search with citation metrics
 *
 * Features:
 * - 100 requests/second without API key
 * - Paper search, citations, references
 * - Author profiles and metrics
 *
 * https://api.semanticscholar.org/
 */

// Types
export type {
  Paper,
  Author,
  SearchResponse,
  SearchOptions,
  CitationsResponse,
  ReferencesResponse,
  ResearchResult,
} from './types.js';

// Paper functions
export {
  searchPapers,
  getPaper,
  getCitations,
  getReferences,
} from './papers.js';

// Author functions
export { searchAuthors, getAuthor, getAuthorPapers } from './authors.js';

// Research functions
export { researchTopic } from './research.js';

// Client utilities
export {
  isAuthenticated,
  hasApiKey,
  getCacheStats,
  clearCache,
} from './client.js';
