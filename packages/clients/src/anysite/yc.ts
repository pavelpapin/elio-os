/**
 * Y Combinator Functions
 */

import { callTool } from './client.js';
import type { YCCompany, YCFounder } from './types.js';

export interface SearchYCCompaniesOptions {
  query?: string;
  batch?: string;
  status?: 'Active' | 'Acquired' | 'Public' | 'Inactive';
  tags?: string[];
  count?: number;
  offset?: number;
  timeout?: number;
}

export async function searchYCCompanies(
  options: SearchYCCompaniesOptions = {}
): Promise<YCCompany[]> {
  const result = await callTool<{ companies: YCCompany[] }>('search_yc_companies', {
    query: options.query,
    batch: options.batch,
    status: options.status,
    tags: options.tags,
    count: options.count || 20,
    offset: options.offset,
    request_timeout: options.timeout || 300
  });
  return result.companies || [];
}

export async function getYCCompany(
  slug: string,
  timeout?: number
): Promise<YCCompany | null> {
  try {
    return await callTool<YCCompany>('get_yc_company', {
      slug,
      request_timeout: timeout || 300
    });
  } catch {
    return null;
  }
}

export interface SearchYCFoundersOptions {
  query?: string;
  company?: string;
  batch?: string;
  industries?: string[];
  titles?: string[];
  top_company?: boolean;
  page?: number;
  hits_per_page?: number;
  timeout?: number;
}

export async function searchYCFounders(
  options: SearchYCFoundersOptions = {}
): Promise<YCFounder[]> {
  const result = await callTool<{ founders: YCFounder[] }>('search_yc_founders', {
    query: options.query,
    company: options.company,
    batch: options.batch,
    industries: options.industries,
    titles: options.titles,
    top_company: options.top_company,
    page: options.page,
    hits_per_page: options.hits_per_page || 20,
    request_timeout: options.timeout || 300
  });
  return result.founders || [];
}
