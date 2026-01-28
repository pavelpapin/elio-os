/**
 * Community Adapter
 * Reddit and Hacker News search
 */

import { z } from 'zod';
import { Adapter, AdapterTool } from '../../gateway/types.js';
import * as community from '@elio/clients/community';
import { withRateLimit } from '../../utils/rate-limiter.js';
import { withCircuitBreaker } from '../../utils/circuit-breaker.js';

const redditSearchSchema = z.object({
  query: z.string().describe('Search query'),
  subreddit: z.string().optional().describe('Limit to specific subreddit'),
  sort: z.enum(['relevance', 'hot', 'top', 'new']).optional()
    .describe('Sort order (default: relevance)'),
  time: z.enum(['hour', 'day', 'week', 'month', 'year', 'all']).optional()
    .describe('Time filter (default: all)'),
  limit: z.number().optional().describe('Max results (default: 25)'),
});

const subredditSchema = z.object({
  subreddit: z.string().describe('Subreddit name (without r/)'),
  sort: z.enum(['hot', 'new', 'top', 'rising']).optional()
    .describe('Sort order (default: hot)'),
  limit: z.number().optional().describe('Max results (default: 25)'),
});

const hnSearchSchema = z.object({
  query: z.string().describe('Search query'),
  tags: z.enum(['story', 'comment', 'poll', 'show_hn', 'ask_hn']).optional()
    .describe('Filter by type (default: story)'),
  limit: z.number().optional().describe('Max results (default: 20)'),
});

const hnFrontpageSchema = z.object({
  limit: z.number().optional().describe('Max results (default: 30)'),
});

const researchSchema = z.object({
  topic: z.string().describe('Topic to research'),
  reddit_limit: z.number().optional().describe('Reddit results (default: 10)'),
  hn_limit: z.number().optional().describe('HN results (default: 10)'),
  subreddits: z.array(z.string()).optional().describe('Specific subreddits to search'),
});

const tools: AdapterTool[] = [
  {
    name: 'reddit_search',
    description: 'Search Reddit posts and comments. Free, no API key required.',
    type: 'read',
    schema: redditSearchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof redditSearchSchema>;
      const result = await withCircuitBreaker('community', () =>
        withRateLimit('community', () =>
          community.searchReddit(p.query, {
            subreddit: p.subreddit,
            sort: p.sort,
            time: p.time,
            limit: p.limit
          })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'subreddit',
    description: 'Get posts from a specific subreddit.',
    type: 'read',
    schema: subredditSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof subredditSchema>;
      const result = await withCircuitBreaker('community', () =>
        withRateLimit('community', () =>
          community.getSubreddit(p.subreddit, {
            sort: p.sort,
            limit: p.limit
          })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'hn_search',
    description: 'Search Hacker News stories and comments.',
    type: 'read',
    schema: hnSearchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof hnSearchSchema>;
      const result = await withCircuitBreaker('community', () =>
        withRateLimit('community', () =>
          community.searchHN(p.query, {
            tags: p.tags,
            limit: p.limit
          })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'hn_frontpage',
    description: 'Get current Hacker News front page stories.',
    type: 'read',
    schema: hnFrontpageSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof hnFrontpageSchema>;
      const result = await withCircuitBreaker('community', () =>
        withRateLimit('community', () =>
          community.getHNFrontPage(p.limit)
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'research',
    description: 'Research a topic across Reddit and Hacker News. Returns community insights and discussions.',
    type: 'read',
    schema: researchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof researchSchema>;
      const result = await withCircuitBreaker('community', () =>
        withRateLimit('community', () =>
          community.researchTopic(p.topic, {
            redditLimit: p.reddit_limit,
            hnLimit: p.hn_limit,
            subreddits: p.subreddits
          })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  }
];

export const communityAdapter: Adapter = {
  name: 'community',
  isAuthenticated: community.isAuthenticated,
  tools
};
