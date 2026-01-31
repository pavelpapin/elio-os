/**
 * LinkedIn Jobs Functions (via AnySite)
 */

import { callTool } from './client.js';
import type { LinkedInJob } from './types.js';

export interface SearchJobsOptions {
  keywords?: string;
  sort?: 'recent' | 'relevance';
  experience_level?: string;
  job_types?: string[];
  work_types?: string[];
  industry?: string;
  company?: string;
  location?: string;
  count?: number;
  timeout?: number;
}

export async function searchJobs(
  options: SearchJobsOptions = {}
): Promise<LinkedInJob[]> {
  const result = await callTool<{ jobs: LinkedInJob[] }>('search_linkedin_jobs', {
    keywords: options.keywords,
    sort: options.sort,
    experience_level: options.experience_level,
    job_types: options.job_types,
    work_types: options.work_types,
    industry: options.industry,
    company: options.company,
    location: options.location,
    count: options.count || 20,
    request_timeout: options.timeout || 300
  });
  return result.jobs || [];
}
