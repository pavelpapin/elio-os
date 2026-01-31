/**
 * GitHub Connector
 * Search repos, code, issues, and developers
 *
 * Features:
 * - Repository search with stars, forks, language filters
 * - Code search across public repos
 * - Issue and discussion search
 * - User/org profiles
 *
 * Rate limits: 60 req/hour unauthenticated, 5000 req/hour with token
 * https://docs.github.com/en/rest
 */

// Re-export types
export * from './types.js';

// Re-export credentials utilities
export { isAuthenticated, hasToken } from './credentials.js';

// Re-export cache utilities
export { getCacheStats, clearCache } from './cache.js';

// Re-export search functions
export { searchRepos, searchCode, searchIssues, searchUsers } from './search.js';

// Re-export repository functions
export { getRepo, getReadme, getUser } from './repo.js';

// Re-export research functions
export { researchTopic, getTrending } from './research.js';
