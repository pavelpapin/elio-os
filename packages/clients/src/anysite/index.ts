/**
 * AnySite Client
 * Unified access to 68 social media & web scraping tools via MCP
 *
 * Categories:
 * - Web: DuckDuckGo search, webpage parsing, sitemap
 * - YC: Y Combinator companies & founders
 * - YouTube: Videos, subtitles, channels, comments
 * - SEC: Company filings and documents
 * - LinkedIn: Profiles, companies, posts, messages, jobs
 * - Instagram: Posts, users, comments
 * - Twitter: Posts, users
 * - Reddit: Posts, comments
 */

// Config & Auth
export { isAuthenticated, getConfig } from './config.js';

// Core client
export { callTool, listTools } from './client.js';

// Types
export * from './types.js';

// Web Search & Parser
export * as web from './web.js';
export { duckduckgoSearch, parseWebpage, getSitemap } from './web.js';

// Y Combinator
export * as yc from './yc.js';
export { searchYCCompanies, getYCCompany, searchYCFounders } from './yc.js';

// YouTube
export * as youtube from './youtube.js';
export {
  searchVideos as searchYouTubeVideos,
  getVideo as getYouTubeVideo,
  getVideoSubtitles as getYouTubeSubtitles,
  getChannelVideos as getYouTubeChannelVideos,
  getVideoComments as getYouTubeComments
} from './youtube.js';

// SEC
export * as sec from './sec.js';
export { searchSECCompanies, getSECDocument } from './sec.js';

// LinkedIn
export * as linkedin from './linkedin.js';

// Instagram
export * as instagram from './instagram.js';

// Twitter
export * as twitter from './twitter.js';

// Reddit
export * as reddit from './reddit.js';
