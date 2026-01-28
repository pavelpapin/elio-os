/**
 * LinkedIn Tools
 */

import { z } from 'zod';
import { AdapterTool } from '../../../gateway/types.js';
import * as anysite from '@elio/clients/anysite';
import { safeCall } from '../utils.js';

const liSearchUsersSchema = z.object({
  keywords: z.string().optional().describe('Search keywords'),
  title: z.string().optional().describe('Job title filter'),
  company_keywords: z.string().optional().describe('Company keywords'),
  location: z.string().optional().describe('Location filter'),
  count: z.number().optional().describe('Max results')
});

const liProfileSchema = z.object({
  user: z.string().describe('User ID, URL, or alias'),
  with_experience: z.boolean().optional().describe('Include experience'),
  with_education: z.boolean().optional().describe('Include education'),
  with_skills: z.boolean().optional().describe('Include skills')
});

const liSearchCompaniesSchema = z.object({
  keywords: z.string().optional().describe('Search keywords'),
  industry: z.string().optional().describe('Industry filter'),
  location: z.string().optional().describe('Location filter'),
  count: z.number().optional().describe('Max results')
});

const liCompanySchema = z.object({
  company: z.string().describe('Company alias, URL, or URN')
});

const liSearchPostsSchema = z.object({
  keywords: z.string().optional().describe('Search keywords'),
  sort: z.enum(['recent', 'relevance']).optional(),
  date_posted: z.enum(['past-month', 'past-week']).optional(),
  count: z.number().optional().describe('Max results')
});

const liSearchJobsSchema = z.object({
  keywords: z.string().optional().describe('Job search keywords'),
  location: z.string().optional().describe('Location'),
  experience_level: z.string().optional().describe('Experience level'),
  count: z.number().optional().describe('Max results')
});

export const linkedinTools: AdapterTool[] = [
  {
    name: 'linkedin_search_users',
    description: 'Search LinkedIn users by keywords, title, company, location',
    type: 'read',
    schema: liSearchUsersSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof liSearchUsersSchema>;
      return safeCall(() => anysite.linkedin.searchUsers(p));
    }
  },
  {
    name: 'linkedin_profile',
    description: 'Get LinkedIn profile with experience, education, skills',
    type: 'read',
    schema: liProfileSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof liProfileSchema>;
      return safeCall(() => anysite.linkedin.getProfile(p.user, {
        with_experience: p.with_experience,
        with_education: p.with_education,
        with_skills: p.with_skills
      }));
    }
  },
  {
    name: 'linkedin_search_companies',
    description: 'Search LinkedIn companies by keywords, industry, location',
    type: 'read',
    schema: liSearchCompaniesSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof liSearchCompaniesSchema>;
      return safeCall(() => anysite.linkedin.searchCompanies(p));
    }
  },
  {
    name: 'linkedin_company',
    description: 'Get LinkedIn company info',
    type: 'read',
    schema: liCompanySchema,
    execute: async (params) => {
      const p = params as z.infer<typeof liCompanySchema>;
      return safeCall(() => anysite.linkedin.getCompany(p.company));
    }
  },
  {
    name: 'linkedin_search_posts',
    description: 'Search LinkedIn posts by keywords, authors, date',
    type: 'read',
    schema: liSearchPostsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof liSearchPostsSchema>;
      return safeCall(() => anysite.linkedin.searchPosts(p));
    }
  },
  {
    name: 'linkedin_search_jobs',
    description: 'Search LinkedIn jobs',
    type: 'read',
    schema: liSearchJobsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof liSearchJobsSchema>;
      return safeCall(() => anysite.linkedin.searchJobs(p));
    }
  }
];
