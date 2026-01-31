/**
 * Tavily Search Connector
 * AI-optimized search API for research
 *
 * Free tier: 1000 API calls/month
 * https://tavily.com
 */

// Types
export type { TavilyResult, TavilySearchResponse, SearchDepth, Topic } from './types.js';

// Client utilities
export { isAuthenticated, getCacheStats, clearCache } from './client.js';

// Search functions
export { search, searchNews, research, searchDomains } from './search.js';
