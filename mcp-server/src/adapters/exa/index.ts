/**
 * Exa Adapter
 * Neural/semantic search - finds content by meaning, not just keywords
 */

import { z } from 'zod';
import { Adapter, AdapterTool } from '../../gateway/types.js';
import * as exa from '@elio/clients/exa';
import { withRateLimit } from '../../utils/rate-limiter.js';
import { withCircuitBreaker } from '../../utils/circuit-breaker.js';

const categoryEnum = z.enum([
  'company', 'research paper', 'news', 'linkedin profile',
  'github', 'tweet', 'movie', 'song', 'personal site', 'pdf'
]);

const searchSchema = z.object({
  query: z.string().describe('Search query (semantic/natural language)'),
  type: z.enum(['neural', 'keyword', 'auto']).optional()
    .describe('Search type (default: auto)'),
  num_results: z.number().optional().describe('Number of results (default: 10)'),
  category: categoryEnum.optional().describe('Filter by content type'),
  include_domains: z.array(z.string()).optional().describe('Only include these domains'),
  exclude_domains: z.array(z.string()).optional().describe('Exclude these domains'),
});

const searchContentsSchema = z.object({
  query: z.string().describe('Search query'),
  num_results: z.number().optional().describe('Number of results (default: 10)'),
  category: categoryEnum.optional().describe('Filter by content type'),
  include_text: z.boolean().optional().describe('Include full text (default: true)'),
  include_highlights: z.boolean().optional().describe('Include key highlights (default: true)'),
  include_summary: z.boolean().optional().describe('Include AI summary (default: false)'),
});

const findSimilarSchema = z.object({
  url: z.string().describe('URL to find similar pages for'),
  num_results: z.number().optional().describe('Number of results (default: 10)'),
  exclude_source_domain: z.boolean().optional().describe('Exclude the source domain'),
  category: categoryEnum.optional().describe('Filter by content type'),
});

const getContentsSchema = z.object({
  urls: z.array(z.string()).describe('URLs to get content for'),
  include_text: z.boolean().optional().describe('Include full text'),
  include_highlights: z.boolean().optional().describe('Include highlights'),
});

const researchSchema = z.object({
  topic: z.string().describe('Topic to research'),
  depth: z.enum(['quick', 'medium', 'deep']).optional()
    .describe('Research depth (default: medium)'),
});

const authoritativeSchema = z.object({
  topic: z.string().describe('Topic to find sources for'),
  num_results: z.number().optional().describe('Number of sources (default: 10)'),
});

const tools: AdapterTool[] = [
  {
    name: 'search',
    description: 'Semantic/neural search. Finds content by meaning, not just keywords. Best for natural language queries.',
    type: 'read',
    schema: searchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof searchSchema>;
      const result = await withCircuitBreaker('exa', () =>
        withRateLimit('exa', () =>
          exa.search(p.query, {
            type: p.type,
            numResults: p.num_results,
            category: p.category,
            includeDomains: p.include_domains,
            excludeDomains: p.exclude_domains,
          })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'search_and_contents',
    description: 'Search and get content/summaries in one call. Efficient for research.',
    type: 'read',
    schema: searchContentsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof searchContentsSchema>;
      const result = await withCircuitBreaker('exa', () =>
        withRateLimit('exa', () =>
          exa.searchAndContents(p.query, {
            numResults: p.num_results,
            category: p.category,
            text: p.include_text !== false,
            highlights: p.include_highlights !== false,
            summary: p.include_summary === true,
          })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'find_similar',
    description: 'Find pages similar to a given URL. Great for discovering related content.',
    type: 'read',
    schema: findSimilarSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof findSimilarSchema>;
      const result = await withCircuitBreaker('exa', () =>
        withRateLimit('exa', () =>
          exa.findSimilar(p.url, {
            numResults: p.num_results,
            excludeSourceDomain: p.exclude_source_domain,
            category: p.category,
          })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'get_contents',
    description: 'Get full content for given URLs.',
    type: 'read',
    schema: getContentsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof getContentsSchema>;
      const result = await withCircuitBreaker('exa', () =>
        withRateLimit('exa', () =>
          exa.getContents(p.urls, {
            text: p.include_text !== false,
            highlights: p.include_highlights,
          })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'research',
    description: 'Comprehensive research on a topic. Combines search, content extraction, and analysis.',
    type: 'read',
    schema: researchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof researchSchema>;
      const numResults = p.depth === 'quick' ? 5 : p.depth === 'deep' ? 20 : 10;
      const result = await withCircuitBreaker('exa', () =>
        withRateLimit('exa', () =>
          exa.researchTopic(p.topic, { numResults })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'find_authoritative',
    description: 'Find authoritative/high-quality sources on a topic.',
    type: 'read',
    schema: authoritativeSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof authoritativeSchema>;
      const result = await withCircuitBreaker('exa', () =>
        withRateLimit('exa', () =>
          exa.findAuthoritativeSources(p.topic, { numResults: p.num_results })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  }
];

export const exaAdapter: Adapter = {
  name: 'exa',
  isAuthenticated: exa.isAuthenticated,
  tools
};
