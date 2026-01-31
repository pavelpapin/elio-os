/**
 * Web Scraping Connector
 * Combines Jina Reader, DuckDuckGo, and Google News RSS
 *
 * Security: Uses execFile with argument arrays to prevent command injection
 */

// Types
export type { JinaReaderResult, DuckDuckGoResult, GoogleNewsResult } from './types.js';

// Jina Reader
export { jinaReader } from './jina.js';

// DuckDuckGo
export { duckduckgoSearch, duckduckgoNews } from './duckduckgo.js';

// Google News
export { googleNewsRss } from './google-news.js';

// Combined search
export { combinedSearch } from './combined.js';
