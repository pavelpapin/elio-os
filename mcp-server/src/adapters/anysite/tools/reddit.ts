/**
 * Reddit Tools
 */

import { z } from 'zod';
import { AdapterTool } from '../../../gateway/types.js';
import * as anysite from '@elio/clients/anysite';
import { safeCall } from '../utils.js';

const redditSearchSchema = z.object({
  query: z.string().describe('Search query'),
  sort: z.enum(['relevance', 'hot', 'top', 'new', 'comments']).optional(),
  time_filter: z.enum(['all', 'day', 'hour', 'month', 'week', 'year']).optional(),
  count: z.number().optional().describe('Max results')
});

const redditPostSchema = z.object({
  post_url: z.string().describe('Reddit post URL or path')
});

export const redditTools: AdapterTool[] = [
  {
    name: 'reddit_search',
    description: 'Search Reddit posts',
    type: 'read',
    schema: redditSearchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof redditSearchSchema>;
      return safeCall(() => anysite.reddit.searchPosts(p.query, {
        sort: p.sort,
        time_filter: p.time_filter,
        count: p.count
      }));
    }
  },
  {
    name: 'reddit_post',
    description: 'Get Reddit post details',
    type: 'read',
    schema: redditPostSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof redditPostSchema>;
      return safeCall(() => anysite.reddit.getPost(p.post_url));
    }
  },
  {
    name: 'reddit_comments',
    description: 'Get Reddit post comments',
    type: 'read',
    schema: redditPostSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof redditPostSchema>;
      return safeCall(() => anysite.reddit.getPostComments(p.post_url));
    }
  }
];
