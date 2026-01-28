/**
 * GitHub Adapter
 * GitHub search and repository exploration
 */

import { z } from 'zod';
import { Adapter, AdapterTool } from '../../gateway/types.js';
import * as github from '@elio/clients/github';
import { withRateLimit } from '../../utils/rate-limiter.js';
import { withCircuitBreaker } from '../../utils/circuit-breaker.js';
import {
  searchReposSchema, searchCodeSchema, searchIssuesSchema,
  searchUsersSchema, getRepoSchema, getReadmeSchema,
  getUserSchema, trendingSchema, researchSchema,
} from './schemas.js';

const tools: AdapterTool[] = [
  {
    name: 'search_repos',
    description: 'Search GitHub repositories. Works without API key (with rate limits).',
    type: 'read',
    schema: searchReposSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof searchReposSchema>;
      const result = await withCircuitBreaker('github', () =>
        withRateLimit('github', () => github.searchRepos(p.query, { language: p.language, sort: p.sort, minStars: p.min_stars, limit: p.limit }))
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'search_code',
    description: 'Search code on GitHub. Requires API token for best results.',
    type: 'read',
    schema: searchCodeSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof searchCodeSchema>;
      const result = await withCircuitBreaker('github', () =>
        withRateLimit('github', () => github.searchCode(p.query, { language: p.language, repo: p.repo, path: p.path, extension: p.extension, limit: p.limit }))
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'search_issues',
    description: 'Search GitHub issues and PRs.',
    type: 'read',
    schema: searchIssuesSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof searchIssuesSchema>;
      const result = await withCircuitBreaker('github', () =>
        withRateLimit('github', () => github.searchIssues(p.query, { type: p.type, state: p.state, repo: p.repo, label: p.label, sort: p.sort, limit: p.limit }))
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'search_users',
    description: 'Search GitHub users and organizations.',
    type: 'read',
    schema: searchUsersSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof searchUsersSchema>;
      const result = await withCircuitBreaker('github', () =>
        withRateLimit('github', () => github.searchUsers(p.query, { type: p.type, location: p.location, followers: p.followers, limit: p.limit }))
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'get_repo',
    description: 'Get repository details.',
    type: 'read',
    schema: getRepoSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof getRepoSchema>;
      const result = await withCircuitBreaker('github', () => withRateLimit('github', () => github.getRepo(p.owner, p.repo)));
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'get_readme',
    description: 'Get repository README content.',
    type: 'read',
    schema: getReadmeSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof getReadmeSchema>;
      const result = await withCircuitBreaker('github', () => withRateLimit('github', () => github.getReadme(p.owner, p.repo)));
      return result || 'No README found';
    }
  },
  {
    name: 'get_user',
    description: 'Get GitHub user profile.',
    type: 'read',
    schema: getUserSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof getUserSchema>;
      const result = await withCircuitBreaker('github', () => withRateLimit('github', () => github.getUser(p.username)));
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'trending',
    description: 'Get trending GitHub repositories.',
    type: 'read',
    schema: trendingSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof trendingSchema>;
      const result = await withCircuitBreaker('github', () =>
        withRateLimit('github', () => github.getTrending({ language: p.language, since: p.since, limit: p.limit }))
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'research',
    description: 'Research a topic on GitHub. Finds relevant repos, analyzes languages and trends.',
    type: 'read',
    schema: researchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof researchSchema>;
      const result = await withCircuitBreaker('github', () =>
        withRateLimit('github', () => github.researchTopic(p.topic, { language: p.language, minStars: p.min_stars, limit: p.limit }))
      );
      return JSON.stringify(result, null, 2);
    }
  }
];

export const githubAdapter: Adapter = {
  name: 'github',
  isAuthenticated: github.isAuthenticated,
  tools
};
