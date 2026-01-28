/**
 * Semantic Scholar Adapter
 * Academic paper search and research
 */

import { z } from 'zod';
import { Adapter, AdapterTool } from '../../gateway/types.js';
import * as scholar from '@elio/clients/semanticscholar';
import { withRateLimit } from '../../utils/rate-limiter.js';
import { withCircuitBreaker } from '../../utils/circuit-breaker.js';

const searchPapersSchema = z.object({
  query: z.string().describe('Search query for papers'),
  limit: z.number().optional().describe('Max results (default: 10)'),
  year: z.string().optional().describe('Filter by year (e.g., "2020-2024" or "2023")'),
  fields_of_study: z.array(z.string()).optional()
    .describe('Filter by fields (e.g., Computer Science, Medicine)'),
});

const getPaperSchema = z.object({
  paper_id: z.string().describe('Semantic Scholar paper ID or DOI'),
});

const citationsSchema = z.object({
  paper_id: z.string().describe('Paper ID to get citations for'),
  limit: z.number().optional().describe('Max results (default: 10)'),
});

const searchAuthorsSchema = z.object({
  query: z.string().describe('Author name to search'),
  limit: z.number().optional().describe('Max results (default: 10)'),
});

const researchSchema = z.object({
  topic: z.string().describe('Research topic'),
  limit: z.number().optional().describe('Papers to analyze (default: 20)'),
});

const tools: AdapterTool[] = [
  {
    name: 'search_papers',
    description: 'Search academic papers via Semantic Scholar. Free, no API key required.',
    type: 'read',
    schema: searchPapersSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof searchPapersSchema>;
      const result = await withCircuitBreaker('scholar', () =>
        withRateLimit('scholar', () =>
          scholar.searchPapers(p.query, {
            limit: p.limit,
            year: p.year,
            fieldsOfStudy: p.fields_of_study
          })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'get_paper',
    description: 'Get paper details by ID or DOI.',
    type: 'read',
    schema: getPaperSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof getPaperSchema>;
      const result = await withCircuitBreaker('scholar', () =>
        withRateLimit('scholar', () =>
          scholar.getPaper(p.paper_id)
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'get_citations',
    description: 'Get papers that cite a given paper.',
    type: 'read',
    schema: citationsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof citationsSchema>;
      const result = await withCircuitBreaker('scholar', () =>
        withRateLimit('scholar', () =>
          scholar.getCitations(p.paper_id, { limit: p.limit })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'get_references',
    description: 'Get papers referenced by a given paper.',
    type: 'read',
    schema: citationsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof citationsSchema>;
      const result = await withCircuitBreaker('scholar', () =>
        withRateLimit('scholar', () =>
          scholar.getReferences(p.paper_id, { limit: p.limit })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'search_authors',
    description: 'Search for academic authors.',
    type: 'read',
    schema: searchAuthorsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof searchAuthorsSchema>;
      const result = await withCircuitBreaker('scholar', () =>
        withRateLimit('scholar', () =>
          scholar.searchAuthors(p.query, { limit: p.limit })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'research_topic',
    description: 'Comprehensive research on academic topic. Analyzes papers, finds key authors and trends.',
    type: 'read',
    schema: researchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof researchSchema>;
      const result = await withCircuitBreaker('scholar', () =>
        withRateLimit('scholar', () =>
          scholar.researchTopic(p.topic, { limit: p.limit })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  }
];

export const semanticscholarAdapter: Adapter = {
  name: 'semanticscholar',
  isAuthenticated: scholar.isAuthenticated,
  tools
};
