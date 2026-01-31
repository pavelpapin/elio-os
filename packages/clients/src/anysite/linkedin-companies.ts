/**
 * LinkedIn Company Functions (via AnySite)
 */

import { callTool } from './client.js';
import type { LinkedInCompany, LinkedInProfile } from './types.js';

export interface SearchCompaniesOptions {
  keywords?: string;
  location?: string;
  industry?: string;
  employee_count?: string;
  count?: number;
  timeout?: number;
}

export async function searchCompanies(
  options: SearchCompaniesOptions = {}
): Promise<LinkedInCompany[]> {
  const result = await callTool<{ companies: LinkedInCompany[] }>('search_linkedin_companies', {
    keywords: options.keywords,
    location: options.location,
    industry: options.industry,
    employee_count: options.employee_count,
    count: options.count || 20,
    request_timeout: options.timeout || 300
  });
  return result.companies || [];
}

export async function getCompany(
  companyIdOrUrl: string,
  timeout?: number
): Promise<LinkedInCompany | null> {
  try {
    return await callTool<LinkedInCompany>('get_linkedin_company', {
      company: companyIdOrUrl,
      request_timeout: timeout || 300
    });
  } catch {
    return null;
  }
}

export interface GetCompanyEmployeesOptions {
  keywords?: string;
  first_name?: string;
  last_name?: string;
  count?: number;
  timeout?: number;
}

export async function getCompanyEmployees(
  companyUrns: string[],
  options: GetCompanyEmployeesOptions = {}
): Promise<LinkedInProfile[]> {
  const result = await callTool<{ employees: LinkedInProfile[] }>('get_linkedin_company_employees', {
    companies: companyUrns,
    keywords: options.keywords,
    first_name: options.first_name,
    last_name: options.last_name,
    count: options.count || 20,
    request_timeout: options.timeout || 300
  });
  return result.employees || [];
}
