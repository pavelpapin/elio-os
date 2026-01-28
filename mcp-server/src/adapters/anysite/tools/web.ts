/**
 * Web Search & Parser Tools
 */

import { z } from 'zod';
import { AdapterTool } from '../../../gateway/types.js';
import * as anysite from '@elio/clients/anysite';
import { safeCall } from '../utils.js';

const searchSchema = z.object({
  query: z.string().describe('Search query'),
  count: z.number().optional().describe('Max results (default: 10, max: 20)')
});

const parseSchema = z.object({
  url: z.string().describe('URL to parse'),
  extract_contacts: z.boolean().optional().describe('Extract emails, phones, social links'),
  only_main_content: z.boolean().optional().describe('Extract only main content (default: true)')
});

const sitemapSchema = z.object({
  url: z.string().describe('Website URL to get sitemap'),
  count: z.number().optional().describe('Max URLs to return'),
  same_host_only: z.boolean().optional().describe('Only same host URLs')
});

export const webTools: AdapterTool[] = [
  {
    name: 'duckduckgo_search',
    description: 'Web search via DuckDuckGo (up to 20 results)',
    type: 'read',
    schema: searchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof searchSchema>;
      return safeCall(() => anysite.duckduckgoSearch(p.query, { count: p.count }));
    }
  },
  {
    name: 'parse_webpage',
    description: 'Parse webpage content, extract text, contacts, links',
    type: 'read',
    schema: parseSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof parseSchema>;
      return safeCall(() => anysite.parseWebpage(p.url, {
        extract_contacts: p.extract_contacts,
        only_main_content: p.only_main_content
      }));
    }
  },
  {
    name: 'get_sitemap',
    description: 'Get website sitemap URLs',
    type: 'read',
    schema: sitemapSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof sitemapSchema>;
      return safeCall(() => anysite.getSitemap(p.url, {
        count: p.count,
        same_host_only: p.same_host_only
      }));
    }
  }
];
