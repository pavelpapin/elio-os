/**
 * Person Research Adapter
 * Exposes person research capabilities as MCP tools
 */

import { z } from 'zod';
import { Adapter, AdapterTool } from '../../gateway/types.js';
import { researchPerson, formatAsMarkdown } from '@elio/person-research';

// Schemas
const researchSchema = z.object({
  name: z.string().describe('Person name (preferably full name)'),
  context: z.string().optional().describe('Additional context: company, title, city, LinkedIn URL'),
  sources: z.array(z.enum(['linkedin', 'twitter', 'github', 'web', 'academic'])).optional()
    .describe('Sources to search (default: all)'),
  output: z.enum(['markdown', 'json']).optional().describe('Output format (default: markdown)'),
});

const quickSearchSchema = z.object({
  name: z.string().describe('Person name'),
  company: z.string().optional().describe('Company name'),
});

const tools: AdapterTool[] = [
  {
    name: 'research',
    description: 'Research a person from open sources (LinkedIn, Twitter, GitHub, web)',
    type: 'read',
    schema: researchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof researchSchema>;

      const result = await researchPerson(p.name, p.context, {
        sources: p.sources,
      });

      if (p.output === 'json') {
        return JSON.stringify(result, null, 2);
      }

      return formatAsMarkdown(result);
    },
  },
  {
    name: 'quick',
    description: 'Quick person lookup - basic profile from web search',
    type: 'read',
    schema: quickSearchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof quickSearchSchema>;
      const context = p.company ? `at ${p.company}` : undefined;

      const result = await researchPerson(p.name, context, {
        sources: ['web'],
        timeout: 10000,
      });

      return formatAsMarkdown(result);
    },
  },
];

export const personResearchAdapter: Adapter = {
  name: 'person-research',
  isAuthenticated: () => true,
  tools,
};

export default personResearchAdapter;
