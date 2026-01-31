/**
 * Twitter/X Connector
 * Search tweets, get user info, find experts
 */

// Types
export type { Tweet, TwitterUser, SearchResult, Expert } from './types.js';

// Search functions
export { searchTweets } from './search.js';

// User functions
export { getUser, getUserTweets, findExperts } from './users.js';

// Client utilities
export {
  isAuthenticated,
  getStatus,
  resetCreditsFlag,
  getCacheStats,
  clearCache,
} from './client.js';
