/**
 * Notion Adapter - Zod Schemas
 */

import { z } from 'zod';

export const searchSchema = z.object({
  query: z.string().describe('Search query'),
  filter: z.enum(['page', 'database']).optional().describe('Filter by type')
});

export const databasesSchema = z.object({});

export const querySchema = z.object({
  databaseId: z.string().describe('Database ID')
});

export const createPageSchema = z.object({
  databaseId: z.string().describe('Database ID'),
  title: z.string().describe('Page title'),
  properties: z.string().optional().describe('JSON properties'),
  skipDuplicateCheck: z.boolean().optional().describe('Skip duplicate check (default: false)')
});

export const deletePageSchema = z.object({
  pageId: z.string().describe('Page ID to archive/delete')
});

export const findDuplicatesSchema = z.object({
  databaseId: z.string().describe('Database ID'),
  titlePattern: z.string().optional().describe('Title pattern to search for duplicates')
});
