/**
 * Twitter/X Tools
 */

import { z } from 'zod';
import { AdapterTool } from '../../../gateway/types.js';
import * as anysite from '@elio/clients/anysite';
import { safeCall } from '../utils.js';

const twSearchSchema = z.object({
  query: z.string().optional().describe('Search query'),
  from_these_accounts: z.array(z.string()).optional().describe('From accounts'),
  min_likes: z.number().optional().describe('Min likes filter'),
  count: z.number().optional().describe('Max results')
});

const twUserSchema = z.object({
  user: z.string().describe('Username or URL')
});

export const twitterTools: AdapterTool[] = [
  {
    name: 'twitter_search',
    description: 'Search Twitter/X posts with advanced filters',
    type: 'read',
    schema: twSearchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof twSearchSchema>;
      return safeCall(() => anysite.twitter.searchPosts(p));
    }
  },
  {
    name: 'twitter_user',
    description: 'Get Twitter/X user profile',
    type: 'read',
    schema: twUserSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof twUserSchema>;
      return safeCall(() => anysite.twitter.getUser(p.user));
    }
  },
  {
    name: 'twitter_user_posts',
    description: 'Get recent posts from Twitter/X user',
    type: 'read',
    schema: twUserSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof twUserSchema>;
      return safeCall(() => anysite.twitter.getUserPosts(p.user));
    }
  }
];
