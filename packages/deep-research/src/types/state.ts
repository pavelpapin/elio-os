/**
 * Pipeline state schema
 */

import { z } from 'zod';
import { STAGE_NAMES } from './schemas.js';
import type {
  ResearchBrief, ResearchPlan, CollectionResult,
  FactCheckResult, SynthesisResult, DevilsAdvocateResult,
  ReportResult, ConsiliumResult
} from './schemas.js';
import {
  ResearchBriefSchema, ResearchPlanSchema, CollectionResultSchema,
  FactCheckResultSchema, SynthesisResultSchema, DevilsAdvocateSchema,
  ReportResultSchema, ConsiliumResultSchema
} from './schemas.js';

export const StageOutputsSchema = z.object({
  discovery: ResearchBriefSchema.optional(),
  planning: ResearchPlanSchema.optional(),
  collection: CollectionResultSchema.optional(),
  factcheck: FactCheckResultSchema.optional(),
  synthesis: SynthesisResultSchema.optional(),
  devils_advocate: DevilsAdvocateSchema.optional(),
  report: ReportResultSchema.optional(),
  review: ConsiliumResultSchema.optional(),
});

export const PipelineStateSchema = z.object({
  run_id: z.string(),
  topic: z.string(),
  current_stage: z.enum([...STAGE_NAMES, 'done']),
  started_at: z.string(),
  updated_at: z.string(),
  iteration: z.number().default(0),
  max_iterations: z.number().default(2),
  status: z.enum(['running', 'paused_for_input', 'completed', 'failed']),
  stage_outputs: StageOutputsSchema,
  error: z.string().optional(),
  stage_attempts: z.record(z.number()).default({}),
  max_stage_attempts: z.number().default(3),
  last_checkpoint_at: z.string().optional(),
});
export type PipelineState = z.infer<typeof PipelineStateSchema>;

export interface GateResult {
  passed: boolean;
  reason?: string;
}

export interface LLMCallOptions {
  provider: 'claude' | 'openai' | 'groq';
  prompt: string;
  input: string;
  outputSchema?: z.ZodSchema;
  maxRetries?: number;
  timeoutMs?: number;
  allowedTools?: string[];
}

export interface StageExecutor {
  execute(state: PipelineState): Promise<unknown>;
}
