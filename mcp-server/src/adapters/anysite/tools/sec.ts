/**
 * SEC Tools
 */

import { z } from 'zod';
import { AdapterTool } from '../../../gateway/types.js';
import * as anysite from '@elio/clients/anysite';
import { safeCall } from '../utils.js';

const secSearchSchema = z.object({
  entity_name: z.string().optional().describe('Company name'),
  forms: z.array(z.string()).optional().describe('Form types (10-K, 10-Q, 8-K, etc.)'),
  date_from: z.string().optional().describe('Start date'),
  date_to: z.string().optional().describe('End date')
});

const secDocSchema = z.object({
  document_url: z.string().describe('SEC document URL')
});

export const secTools: AdapterTool[] = [
  {
    name: 'sec_search',
    description: 'Search SEC filings (10-K, 10-Q, 8-K, etc.)',
    type: 'read',
    schema: secSearchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof secSearchSchema>;
      return safeCall(() => anysite.searchSECCompanies({
        entity_name: p.entity_name,
        forms: p.forms as anysite.sec.SECFormType[],
        date_from: p.date_from,
        date_to: p.date_to
      }));
    }
  },
  {
    name: 'sec_document',
    description: 'Get SEC document content',
    type: 'read',
    schema: secDocSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof secDocSchema>;
      return safeCall(() => anysite.getSECDocument(p.document_url));
    }
  }
];
