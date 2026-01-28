/**
 * Brave Search Adapter
 * Exposes Brave Search API as MCP tools
 */

import { z } from 'zod';
import { Adapter, AdapterTool } from '../../gateway/types.js';
import * as brave from '@elio/clients/brave';
import { withRateLimit } from '../../utils/rate-limiter.js';
import { withCircuitBreaker } from '../../utils/circuit-breaker.js';

const searchSchema = z.object({
  query: z.string().describe('Search query'),
  count: z.number().optional().describe('Number of results (default: 10)'),
  freshness: z.enum(['pd', 'pw', 'pm', 'py']).optional()
    .describe('Freshness: pd=past day, pw=past week, pm=past month, py=past year'),
});

const newsSchema = z.object({
  query: z.string().describe('News search query'),
  count: z.number().optional().describe('Number of results (default: 10)'),
  freshness: z.enum(['pd', 'pw', 'pm']).optional()
    .describe('Freshness: pd=past day, pw=past week, pm=past month'),
});

const tools: AdapterTool[] = [
  {
    name: 'search',
    description: 'Web search via Brave Search API. Fast, privacy-focused, with 7-day caching.',
    type: 'read',
    schema: searchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof searchSchema>;

      const result = await withCircuitBreaker('brave', () =>
        withRateLimit('brave', () =>
          brave.search(p.query, { count: p.count, freshness: p.freshness })
        )
      );

      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'news',
    description: 'News search via Brave Search API. Returns recent news articles.',
    type: 'read',
    schema: newsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof newsSchema>;

      const result = await withCircuitBreaker('brave', () =>
        withRateLimit('brave', () =>
          brave.searchNews(p.query, { count: p.count, freshness: p.freshness })
        )
      );

      return JSON.stringify(result, null, 2);
    }
  }
];

export const braveAdapter: Adapter = {
  name: 'brave',
  isAuthenticated: brave.isAuthenticated,
  tools
};
