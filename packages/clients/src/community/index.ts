/**
 * Community Connector
 * Reddit and Hacker News for community insights
 *
 * Features:
 * - Reddit search (via JSON API, no auth required)
 * - Hacker News (via Firebase API, free)
 * - Subreddit analysis
 * - Comment threads
 */

// Types
export type {
  RedditPost,
  RedditComment,
  RedditSearchResult,
  RedditSearchOptions,
  SubredditOptions,
  HNStory,
  HNComment,
  HNSearchResult,
  HNSearchOptions,
  CommunityResearch,
  ResearchOptions,
} from './types.js';

// Reddit functions
export { searchReddit, getSubreddit, getRedditComments } from './reddit.js';

// Hacker News functions
export { searchHN, getHNFrontPage, getHNComments } from './hackernews.js';

// Research functions
export { researchTopic } from './research.js';

// Cache utilities
export { getCacheStats, clearCache } from './cache.js';

// No auth required for Reddit/HN
export function isAuthenticated(): boolean {
  return true;
}
