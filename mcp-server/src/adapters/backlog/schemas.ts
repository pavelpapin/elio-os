/**
 * Backlog Schemas
 * Zod schemas for backlog tool validation
 */

import { z } from 'zod';

export const createItemSchema = z.object({
  title: z.string().describe('Task title'),
  type: z.enum(['technical', 'product']).describe('Backlog type'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional().describe('Priority level'),
  category: z.string().optional().describe('Category (e.g., Architecture, UX, Security)'),
  description: z.string().optional().describe('Detailed description'),
  effort: z.enum(['xs', 's', 'm', 'l', 'xl']).optional().describe('Effort estimate'),
  impact: z.enum(['high', 'medium', 'low']).optional().describe('Impact level (for product backlog)'),
  source: z.enum(['cto_review', 'cpo_review', 'user_feedback', 'manual', 'bug_report', 'correction_log']).optional(),
  source_quote: z.string().optional().describe('Original user quote if from feedback'),
  sync_to_notion: z.boolean().optional().default(true).describe('Sync to Notion immediately')
});

export const listItemsSchema = z.object({
  type: z.enum(['technical', 'product']).optional().describe('Filter by backlog type'),
  status: z.enum(['backlog', 'in_progress', 'done', 'blocked', 'cancelled']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  limit: z.number().optional().default(50)
});

export const updateItemSchema = z.object({
  id: z.string().describe('Backlog item ID'),
  title: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  status: z.enum(['backlog', 'in_progress', 'done', 'blocked', 'cancelled']).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  effort: z.enum(['xs', 's', 'm', 'l', 'xl']).optional(),
  sync_to_notion: z.boolean().optional().default(true)
});

export const syncSchema = z.object({
  type: z.enum(['technical', 'product']).optional().describe('Sync specific backlog type'),
  direction: z.enum(['to_notion', 'from_notion', 'full']).optional().default('full')
});

export const completeItemSchema = z.object({
  id: z.string().describe('Backlog item ID'),
  sync_to_notion: z.boolean().optional().default(true)
});

export const emptySchema = z.object({});

export type CreateItemParams = z.infer<typeof createItemSchema>;
export type ListItemsParams = z.infer<typeof listItemsSchema>;
export type UpdateItemParams = z.infer<typeof updateItemSchema>;
export type SyncParams = z.infer<typeof syncSchema>;
export type CompleteItemParams = z.infer<typeof completeItemSchema>;
