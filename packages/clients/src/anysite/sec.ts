/**
 * SEC (Securities and Exchange Commission) Functions
 */

import { callTool } from './client.js';
import type { SECDocument } from './types.js';

export type SECFormType = '10-K' | '10-Q' | '8-K' | 'DEF 14A' | 'S-1' | '4';

export interface SearchSECCompaniesOptions {
  entity_name?: string;
  forms?: SECFormType[];
  location_codes?: string[];
  date_from?: string;
  date_to?: string;
  timeout?: number;
}

export async function searchSECCompanies(
  options: SearchSECCompaniesOptions = {}
): Promise<SECDocument[]> {
  const result = await callTool<{ documents: SECDocument[] }>('search_sec_companies', {
    entity_name: options.entity_name,
    forms: options.forms,
    location_codes: options.location_codes,
    date_from: options.date_from,
    date_to: options.date_to,
    request_timeout: options.timeout || 300
  });
  return result.documents || [];
}

export interface SECDocumentContent {
  url: string;
  content: string;
  parsed_text?: string;
}

export async function getSECDocument(
  documentUrl: string,
  timeout?: number
): Promise<SECDocumentContent | null> {
  try {
    return await callTool<SECDocumentContent>('get_sec_document', {
      document_url: documentUrl,
      request_timeout: timeout || 300
    });
  } catch {
    return null;
  }
}
