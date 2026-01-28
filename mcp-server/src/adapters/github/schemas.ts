/**
 * GitHub Adapter - Zod Schemas
 */

import { z } from 'zod';

export const searchReposSchema = z.object({
  query: z.string().describe('Search query'),
  language: z.string().optional().describe('Filter by language (e.g., typescript, python)'),
  sort: z.enum(['stars', 'forks', 'updated', 'help-wanted-issues']).optional()
    .describe('Sort order (default: stars)'),
  min_stars: z.number().optional().describe('Minimum stars filter'),
  limit: z.number().optional().describe('Max results (default: 10)'),
});

export const searchCodeSchema = z.object({
  query: z.string().describe('Code search query'),
  language: z.string().optional().describe('Filter by language'),
  repo: z.string().optional().describe('Limit to specific repo (owner/repo)'),
  path: z.string().optional().describe('Filter by path'),
  extension: z.string().optional().describe('Filter by file extension'),
  limit: z.number().optional().describe('Max results (default: 10)'),
});

export const searchIssuesSchema = z.object({
  query: z.string().describe('Issue search query'),
  type: z.enum(['issue', 'pr']).optional().describe('Filter by type'),
  state: z.enum(['open', 'closed']).optional().describe('Issue state'),
  repo: z.string().optional().describe('Limit to specific repo (owner/repo)'),
  label: z.string().optional().describe('Filter by label'),
  sort: z.enum(['created', 'updated', 'comments']).optional()
    .describe('Sort order (default: updated)'),
  limit: z.number().optional().describe('Max results (default: 10)'),
});

export const searchUsersSchema = z.object({
  query: z.string().describe('User/org search query'),
  type: z.enum(['user', 'org']).optional().describe('Filter by type'),
  location: z.string().optional().describe('Filter by location'),
  followers: z.string().optional().describe('Followers filter (e.g., ">1000")'),
  limit: z.number().optional().describe('Max results (default: 10)'),
});

export const getRepoSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
});

export const getReadmeSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
});

export const getUserSchema = z.object({
  username: z.string().describe('GitHub username'),
});

export const trendingSchema = z.object({
  language: z.string().optional().describe('Filter by language'),
  since: z.enum(['daily', 'weekly', 'monthly']).optional()
    .describe('Time range (default: weekly)'),
  limit: z.number().optional().describe('Max results (default: 10)'),
});

export const researchSchema = z.object({
  topic: z.string().describe('Topic to research'),
  language: z.string().optional().describe('Filter by language'),
  min_stars: z.number().optional().describe('Minimum stars (default: 100)'),
  limit: z.number().optional().describe('Papers to analyze (default: 20)'),
});
