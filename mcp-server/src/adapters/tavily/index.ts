/**
 * Tavily Adapter
 * AI-powered search with research capabilities
 */

import { z } from 'zod';
import { Adapter, AdapterTool } from '../../gateway/types.js';
import * as tavily from '@elio/clients/tavily';
import { withRateLimit } from '../../utils/rate-limiter.js';
import { withCircuitBreaker } from '../../utils/circuit-breaker.js';

const searchSchema = z.object({
  query: z.string().describe('Search query'),
  depth: z.enum(['basic', 'advanced']).optional()
    .describe('Search depth (default: basic)'),
  max_results: z.number().optional().describe('Max results (default: 10)'),
});

const newsSchema = z.object({
  query: z.string().describe('News search query'),
  days: z.number().optional().describe('Search within last N days (default: 7)'),
  max_results: z.number().optional().describe('Max results (default: 10)'),
});

const researchSchema = z.object({
  query: z.string().describe('Research topic'),
  max_results: z.number().optional().describe('Max results (default: 10)'),
});

const domainsSchema = z.object({
  query: z.string().describe('Search query'),
  domains: z.array(z.string()).describe('Domains to search within'),
  max_results: z.number().optional().describe('Max results (default: 10)'),
});

const tools: AdapterTool[] = [
  {
    name: 'search',
    description: 'AI-powered web search via Tavily. Returns relevant, curated results.',
    type: 'read',
    schema: searchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof searchSchema>;
      const result = await withCircuitBreaker('tavily', () =>
        withRateLimit('tavily', () =>
          tavily.search(p.query, { search_depth: p.depth, max_results: p.max_results })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'news',
    description: 'Search recent news via Tavily.',
    type: 'read',
    schema: newsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof newsSchema>;
      const result = await withCircuitBreaker('tavily', () =>
        withRateLimit('tavily', () =>
          tavily.searchNews(p.query, { days: p.days, max_results: p.max_results })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'research',
    description: 'Deep research on a topic via Tavily. Returns comprehensive analysis.',
    type: 'read',
    schema: researchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof researchSchema>;
      const result = await withCircuitBreaker('tavily', () =>
        withRateLimit('tavily', () =>
          tavily.research(p.query, { max_results: p.max_results })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'search_domains',
    description: 'Search within specific domains via Tavily.',
    type: 'read',
    schema: domainsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof domainsSchema>;
      const result = await withCircuitBreaker('tavily', () =>
        withRateLimit('tavily', () =>
          tavily.searchDomains(p.query, p.domains, { max_results: p.max_results })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  }
];

export const tavilyAdapter: Adapter = {
  name: 'tavily',
  isAuthenticated: tavily.isAuthenticated,
  tools
};
