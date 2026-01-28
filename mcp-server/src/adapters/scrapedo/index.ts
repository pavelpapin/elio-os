/**
 * Scrapedo Adapter
 * Premium proxy scraper that bypasses blocks (LinkedIn, Google, SPAs)
 */

import { z } from 'zod';
import { Adapter, AdapterTool } from '../../gateway/types.js';
import * as scrapedo from '@elio/clients/scrapedo';

const scrapeSchema = z.object({
  url: z.string().describe('URL to scrape'),
  render: z.boolean().optional().describe('Render JavaScript (for SPAs)'),
  residential: z.boolean().optional().describe('Use residential proxies'),
  geo_code: z.string().optional().describe('Target country (us, uk, de, etc.)'),
  wait_selector: z.string().optional().describe('Wait for CSS selector before returning'),
});

const linkedinSchema = z.object({
  profile_url: z.string().describe('LinkedIn profile URL or username'),
});

const googleSchema = z.object({
  query: z.string().describe('Search query'),
  num: z.number().optional().describe('Number of results (default: 10)'),
  lang: z.string().optional().describe('Language (default: en)'),
});

const jsSchema = z.object({
  url: z.string().describe('URL to scrape'),
  wait_selector: z.string().optional().describe('Wait for CSS selector'),
});

const tools: AdapterTool[] = [
  {
    name: 'scrape',
    description: 'Scrape any URL through premium proxy. Bypasses blocks on protected sites.',
    type: 'read',
    schema: scrapeSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof scrapeSchema>;
      const result = await scrapedo.scrape(p.url, {
        render: p.render,
        residential: p.residential,
        geoCode: p.geo_code,
        waitSelector: p.wait_selector,
      });

      if (!result.success) {
        return `Error: ${result.error}`;
      }

      // Truncate very long content
      const content = result.content.length > 50000
        ? result.content.slice(0, 50000) + '\n\n[Truncated...]'
        : result.content;

      return `URL: ${result.url}\nCached: ${result.cached}\nStatus: ${result.statusCode || 'N/A'}\n\n${content}`;
    }
  },
  {
    name: 'scrape_linkedin',
    description: 'Scrape LinkedIn profile. Uses residential proxies and JS rendering.',
    type: 'read',
    schema: linkedinSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof linkedinSchema>;
      const result = await scrapedo.scrapeLinkedIn(p.profile_url);

      if (!result.success) {
        return `Error scraping LinkedIn: ${result.error}`;
      }

      return `LinkedIn Profile: ${result.url}\nCached: ${result.cached}\n\n${result.content.slice(0, 30000)}`;
    }
  },
  {
    name: 'scrape_google',
    description: 'Scrape Google search results. Bypasses CAPTCHA via proxy.',
    type: 'read',
    schema: googleSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof googleSchema>;
      const result = await scrapedo.scrapeGoogle(p.query, {
        num: p.num,
        lang: p.lang,
      });

      if (!result.success) {
        return `Error scraping Google: ${result.error}`;
      }

      return `Google Search: ${p.query}\nCached: ${result.cached}\n\n${result.content.slice(0, 30000)}`;
    }
  },
  {
    name: 'scrape_with_js',
    description: 'Scrape JavaScript-rendered page (SPAs, React, Vue apps).',
    type: 'read',
    schema: jsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof jsSchema>;
      const result = await scrapedo.scrapeWithJs(p.url, p.wait_selector);

      if (!result.success) {
        return `Error: ${result.error}`;
      }

      return `URL: ${result.url}\nRendered: true\nCached: ${result.cached}\n\n${result.content.slice(0, 50000)}`;
    }
  }
];

export const scrapedoAdapter: Adapter = {
  name: 'scrapedo',
  isAuthenticated: scrapedo.isAuthenticated,
  tools
};
