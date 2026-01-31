/**
 * @elio/clients
 * Unified API clients for external services
 *
 * Combines connectors (API key auth) and integrations (OAuth)
 * into a single package for all external service access.
 */

// ===== Search & Research =====
export * as perplexity from './perplexity/index.js';
export * as brave from './brave/index.js';
export * as serper from './serper/index.js';
export * as tavily from './tavily/index.js';
export * as exa from './exa/index.js';
export * as grok from './grok/index.js';
export * as webscraping from './webscraping/index.js';

// ===== Social & Community =====
export * as twitter from './twitter/index.js';
export * as community from './community/index.js';
export * as linkedin from './linkedin/index.js';
export * as telegram from './telegram/index.js';
export * as slack from './slack/index.js';

// ===== Developer Platforms =====
export * as github from './github/index.js';
export * as youtube from './youtube/index.js';
export * as semanticscholar from './semanticscholar/index.js';

// ===== Google Workspace =====
export * as calendar from './calendar/index.js';
export * as docs from './docs/index.js';
export * as sheets from './sheets/index.js';

// ===== Productivity & Automation =====
export * as notion from './notion/index.js';
export * as notebooklm from './notebooklm/index.js';
export * as n8n from './n8n/index.js';

// ===== AI & Transcription =====
// INTERNAL: used by whisper adapter, not exposed via MCP directly
export * as groq from './groq/index.js';

// ===== Scraping & Proxy =====
export * as scrapedo from './scrapedo/index.js';

// ===== Database =====
// INTERNAL: used by sql adapter, not exposed via MCP directly
export * as supabase from './supabase/index.js';

// ===== Utilities =====
// INTERNAL: helpers for other clients, not exposed via MCP
export * as utils from './utils/index.js';

// Re-export key functions for convenience
export {
  research as perplexityResearch,
  search as perplexitySearch,
  factCheck as perplexityFactCheck
} from './perplexity/index.js';

export {
  duckduckgoSearch,
  duckduckgoNews,
  googleNewsRss,
  jinaReader,
  combinedSearch
} from './webscraping/index.js';

export {
  getYoutubeTranscript,
  searchVideos as youtubeSearch,
  getChannelVideos,
  getChannelInfo,
  getVideoDetails as youtubeVideoDetails
} from './youtube/index.js';

export {
  search as braveSearch,
  searchNews as braveNews
} from './brave/index.js';

export {
  searchTweets as twitterSearch,
  getUser as twitterGetUser,
  findExperts as twitterFindExperts
} from './twitter/index.js';

export {
  search as tavilySearch,
  searchNews as tavilyNews,
  research as tavilyResearch,
  searchDomains as tavilySearchDomains
} from './tavily/index.js';

export {
  chat as grokChat,
  research as grokResearch,
  analyzeTrends as grokAnalyzeTrends,
  getExpertOpinions as grokExperts
} from './grok/index.js';

export {
  searchPapers,
  getPaper,
  getCitations,
  getReferences,
  searchAuthors,
  researchTopic as scholarResearch
} from './semanticscholar/index.js';

export {
  searchReddit,
  getSubreddit,
  searchHN,
  getHNFrontPage,
  researchTopic as communityResearch
} from './community/index.js';

export {
  searchRepos as githubSearchRepos,
  searchCode as githubSearchCode,
  searchIssues as githubSearchIssues,
  getRepo as githubGetRepo,
  getReadme as githubGetReadme,
  researchTopic as githubResearch,
  getTrending as githubTrending
} from './github/index.js';

export {
  search as exaSearch,
  searchAndContents as exaSearchWithContent,
  findSimilar as exaFindSimilar,
  researchTopic as exaResearch,
  findAuthoritativeSources as exaAuthoritative
} from './exa/index.js';
