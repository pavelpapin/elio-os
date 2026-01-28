/**
 * Serper Adapter
 * Exposes Serper (Google Search API) as MCP tools
 */

import { z } from 'zod';
import { Adapter, AdapterTool } from '../../gateway/types.js';
import * as serper from '@elio/clients/serper';
import { withRateLimit } from '../../utils/rate-limiter.js';
import { withCircuitBreaker } from '../../utils/circuit-breaker.js';

const searchSchema = z.object({
  query: z.string().describe('Search query'),
  num: z.number().optional().describe('Number of results (default: 10)'),
  gl: z.string().optional().describe('Country code (us, ru, de, etc)'),
  hl: z.string().optional().describe('Language (en, ru, de, etc)'),
});

const newsSchema = z.object({
  query: z.string().describe('News search query'),
  num: z.number().optional().describe('Number of results (default: 10)'),
  gl: z.string().optional().describe('Country code'),
  hl: z.string().optional().describe('Language'),
});

const imagesSchema = z.object({
  query: z.string().describe('Image search query'),
  num: z.number().optional().describe('Number of results (default: 10)'),
  gl: z.string().optional().describe('Country code'),
});

const tools: AdapterTool[] = [
  {
    name: 'search',
    description: 'Google Search via Serper API. Fast, accurate results with 24h caching.',
    type: 'read',
    schema: searchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof searchSchema>;

      const result = await withCircuitBreaker('serper', () =>
        withRateLimit('serper', () =>
          serper.search(p.query, { num: p.num, gl: p.gl, hl: p.hl })
        )
      );

      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'news',
    description: 'Google News via Serper API. Returns recent news articles.',
    type: 'read',
    schema: newsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof newsSchema>;

      const result = await withCircuitBreaker('serper', () =>
        withRateLimit('serper', () =>
          serper.searchNews(p.query, { num: p.num, gl: p.gl, hl: p.hl })
        )
      );

      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'images',
    description: 'Google Images via Serper API. Returns image search results.',
    type: 'read',
    schema: imagesSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof imagesSchema>;

      const result = await withCircuitBreaker('serper', () =>
        withRateLimit('serper', () =>
          serper.searchImages(p.query, { num: p.num, gl: p.gl })
        )
      );

      return JSON.stringify(result, null, 2);
    }
  }
];

export const serperAdapter: Adapter = {
  name: 'serper',
  isAuthenticated: serper.isAuthenticated,
  tools
};
