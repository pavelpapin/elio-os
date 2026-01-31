/**
 * Zod schemas for stage outputs
 */

import { z } from 'zod';
import { ReviewDataSchema, FixPlanSchema } from '../types.js';
import type { StageId } from './types.js';

export const CollectOutputSchema = ReviewDataSchema;

export const AnalyzeOutputSchema = FixPlanSchema;

export const FixOutputSchema = z.object({
  results: z.array(z.object({
    actionId: z.string(),
    description: z.string(),
    success: z.boolean(),
    output: z.string(),
  })),
  headBefore: z.string(),
  fixesApplied: z.boolean(),
  plan: z.any().optional(),
  reviewData: z.any().optional(),
  selfHealResult: z.any().optional(),
});

export const SplitFilesOutputSchema = z.object({
  results: z.array(z.object({
    actionId: z.string(),
    description: z.string(),
    success: z.boolean(),
    output: z.string(),
  })),
  splitCount: z.number(),
  totalFiles: z.number(),
  fixesApplied: z.boolean().optional(),
});

export const VerifyOutputSchema = z.object({
  buildPassed: z.boolean(),
  testsPassed: z.boolean(),
  buildOutput: z.string(),
  testOutput: z.string(),
  diffStats: z.object({
    insertions: z.number(),
    deletions: z.number(),
    files: z.number(),
  }),
});

export const ReportOutputSchema = z.object({
  markdown: z.string().min(100),
  telegram: z.string().min(1),
  score: z.number().min(0).max(100),
  reportPath: z.string(),
});

export const DeliverOutputSchema = z.object({
  reportPath: z.string().min(1),
  telegramSent: z.boolean(),
  notionUrl: z.string().optional(),
});

export const StageOutputSchemas: Record<StageId, z.ZodTypeAny> = {
  collect: CollectOutputSchema,
  analyze: AnalyzeOutputSchema,
  fix: FixOutputSchema,
  'split-files': SplitFilesOutputSchema,
  verify: VerifyOutputSchema,
  report: ReportOutputSchema,
  deliver: DeliverOutputSchema,
};
