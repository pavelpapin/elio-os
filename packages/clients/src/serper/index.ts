/**
 * Serper Connector
 * Google Search via Serper.dev API with caching
 */

// Types
export type {
  SerperSearchResult,
  SerperSearchResponse,
  SerperNewsResult,
  SerperImageResult
} from './types.js';

// Client utilities
export { isAuthenticated, getCacheStats, clearCache } from './client.js';

// Search functions
export { search } from './search.js';
export { searchNews } from './news.js';
export { searchImages } from './images.js';
