/**
 * Y Combinator Tools
 */

import { z } from 'zod';
import { AdapterTool } from '../../../gateway/types.js';
import * as anysite from '@elio/clients/anysite';
import { safeCall } from '../utils.js';

const ycCompanySchema = z.object({
  slug: z.string().describe('YC company slug')
});

const ycSearchSchema = z.object({
  query: z.string().optional().describe('Search query'),
  batch: z.string().optional().describe('YC batch (e.g., W21, S22)'),
  status: z.enum(['Active', 'Acquired', 'Public', 'Inactive']).optional(),
  count: z.number().optional().describe('Max results (default: 20)')
});

const ycFoundersSchema = z.object({
  query: z.string().optional().describe('Search query'),
  company: z.string().optional().describe('Company name'),
  batch: z.string().optional().describe('YC batch'),
  count: z.number().optional().describe('Max results')
});

export const ycTools: AdapterTool[] = [
  {
    name: 'yc_company',
    description: 'Get Y Combinator company info by slug',
    type: 'read',
    schema: ycCompanySchema,
    execute: async (params) => {
      const p = params as z.infer<typeof ycCompanySchema>;
      return safeCall(() => anysite.getYCCompany(p.slug));
    }
  },
  {
    name: 'yc_search_companies',
    description: 'Search Y Combinator companies (batch, status, tags)',
    type: 'read',
    schema: ycSearchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof ycSearchSchema>;
      return safeCall(() => anysite.searchYCCompanies({
        query: p.query,
        batch: p.batch,
        status: p.status,
        count: p.count
      }));
    }
  },
  {
    name: 'yc_search_founders',
    description: 'Search YC founders',
    type: 'read',
    schema: ycFoundersSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof ycFoundersSchema>;
      return safeCall(() => anysite.searchYCFounders({
        query: p.query,
        company: p.company,
        batch: p.batch,
        hits_per_page: p.count
      }));
    }
  }
];
