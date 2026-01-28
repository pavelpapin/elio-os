/**
 * Twitter/X Adapter
 * Exposes X API v2 as MCP tools
 */

import { z } from 'zod';
import { Adapter, AdapterTool } from '../../gateway/types.js';
import * as twitter from '@elio/clients/twitter';
import { withRateLimit } from '../../utils/rate-limiter.js';
import { withCircuitBreaker } from '../../utils/circuit-breaker.js';

const searchSchema = z.object({
  query: z.string().describe('Search query (supports Twitter search operators)'),
  max_results: z.number().optional().describe('Max results (default: 10, max: 10 for free tier)'),
});

const userSchema = z.object({
  username: z.string().describe('Twitter username (without @)')
});

const userTweetsSchema = z.object({
  username: z.string().describe('Twitter username'),
  max_results: z.number().optional().describe('Max results (default: 10)')
});

const expertsSchema = z.object({
  topic: z.string().describe('Topic to find experts on'),
  min_followers: z.number().optional().describe('Minimum followers (default: 10000)')
});

const statusSchema = z.object({});

const tools: AdapterTool[] = [
  {
    name: 'search',
    description: 'Search recent tweets (last 7 days). Supports operators: from:user, to:user, -is:retweet, lang:en, has:links',
    type: 'read',
    schema: searchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof searchSchema>;

      const result = await withCircuitBreaker('twitter', () =>
        withRateLimit('twitter', () =>
          twitter.searchTweets(p.query, { max_results: p.max_results })
        )
      );

      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'user',
    description: 'Get Twitter user profile by username',
    type: 'read',
    schema: userSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof userSchema>;

      const result = await withCircuitBreaker('twitter', () =>
        withRateLimit('twitter', () =>
          twitter.getUser(p.username)
        )
      );

      if (!result) {
        return JSON.stringify({ error: 'User not found' });
      }

      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'user_tweets',
    description: 'Get recent tweets from a specific user',
    type: 'read',
    schema: userTweetsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof userTweetsSchema>;

      // First get user ID
      const user = await twitter.getUser(p.username);
      if (!user) {
        return JSON.stringify({ error: 'User not found' });
      }

      const result = await withCircuitBreaker('twitter', () =>
        withRateLimit('twitter', () =>
          twitter.getUserTweets(user.id, { max_results: p.max_results })
        )
      );

      return JSON.stringify({
        user: { name: user.name, username: user.username },
        tweets: result
      }, null, 2);
    }
  },
  {
    name: 'find_experts',
    description: 'Find thought leaders and experts discussing a topic',
    type: 'read',
    schema: expertsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof expertsSchema>;

      const result = await withCircuitBreaker('twitter', () =>
        withRateLimit('twitter', () =>
          twitter.findExperts(p.topic, { min_followers: p.min_followers })
        )
      );

      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'status',
    description: 'Get Twitter integration status (API availability, credits, scraper status)',
    type: 'read',
    schema: statusSchema,
    execute: async () => {
      const status = twitter.getStatus();
      return JSON.stringify({
        ...status,
        available: twitter.isAuthenticated(),
        cache: twitter.getCacheStats()
      }, null, 2);
    }
  }
];

export const twitterAdapter: Adapter = {
  name: 'twitter',
  isAuthenticated: twitter.isAuthenticated,
  tools
};
