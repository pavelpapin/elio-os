/**
 * Perplexity API
 * Updated for new Sonar models (Jan 2026)
 * WITH CACHING to minimize costs
 */

// Cache management
export { getCacheStats, clearCache } from './cache.js';

// Search
export { search } from './search.js';

// Research
export { research } from './research.js';

// Fact checking
export { factCheck } from './factcheck.js';

// Utilities
export { summarize, compare } from './utils.js';
