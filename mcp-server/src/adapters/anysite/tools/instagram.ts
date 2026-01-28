/**
 * Instagram Tools
 */

import { z } from 'zod';
import { AdapterTool } from '../../../gateway/types.js';
import * as anysite from '@elio/clients/anysite';
import { safeCall } from '../utils.js';

const igUserSchema = z.object({
  user: z.string().describe('User ID, alias, or URL')
});

const igPostSchema = z.object({
  post: z.string().describe('Post ID')
});

const igSearchSchema = z.object({
  query: z.string().describe('Search query'),
  count: z.number().optional().describe('Max results')
});

export const instagramTools: AdapterTool[] = [
  {
    name: 'instagram_user',
    description: 'Get Instagram user profile',
    type: 'read',
    schema: igUserSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof igUserSchema>;
      return safeCall(() => anysite.instagram.getUser(p.user));
    }
  },
  {
    name: 'instagram_user_posts',
    description: 'Get Instagram user posts',
    type: 'read',
    schema: igUserSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof igUserSchema>;
      return safeCall(() => anysite.instagram.getUserPosts(p.user));
    }
  },
  {
    name: 'instagram_post',
    description: 'Get Instagram post details',
    type: 'read',
    schema: igPostSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof igPostSchema>;
      return safeCall(() => anysite.instagram.getPost(p.post));
    }
  },
  {
    name: 'instagram_search',
    description: 'Search Instagram posts',
    type: 'read',
    schema: igSearchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof igSearchSchema>;
      return safeCall(() => anysite.instagram.searchPosts(p.query, { count: p.count }));
    }
  }
];
