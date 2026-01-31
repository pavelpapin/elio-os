/**
 * Deep Research — Zod schemas for all stage I/O
 */

import { z } from 'zod';

// ─── Stage Names ─────────────────────────────────────────────

export const STAGE_NAMES = [
  'discovery', 'planning', 'collection', 'factcheck',
  'synthesis', 'devils_advocate', 'report', 'review',
] as const;

export type StageName = (typeof STAGE_NAMES)[number];

// ─── Stage 0: Discovery ─────────────────────────────────────

export const ResearchBriefSchema = z.object({
  topic: z.string().min(1),
  goal: z.string(),
  success_criteria: z.array(z.string()).min(1),
  geography: z.array(z.string()),
  scope: z.object({
    include: z.array(z.string()),
    exclude: z.array(z.string()),
    priorities: z.array(z.string()),
  }),
  depth: z.string(),
  constraints: z.record(z.string()),
  format: z.string().default('notion_page'),
  context: z.string().optional(),
  user_background: z.string().optional(),
  detail_level: z.enum(['broad', 'deep', 'balanced']).default('balanced'),
  confirmed_by_user: z.literal(true),
});
export type ResearchBrief = z.infer<typeof ResearchBriefSchema>;

// ─── Stage 1: Planning ──────────────────────────────────────

export const ResearchPlanSchema = z.object({
  research_id: z.string(),
  subtopics: z.array(
    z.union([
      z.string(),
      z.object({ name: z.string(), description: z.string().optional() }).transform(o => o.name),
    ])
  ).min(1),
  agents: z.array(z.enum(['web_scout', 'market', 'tech', 'legal', 'people'])).default(['web_scout', 'market', 'tech']),
  quality_criteria: z.array(z.string()),
  estimated_time: z.string().optional(),
});
export type ResearchPlan = z.infer<typeof ResearchPlanSchema>;

// ─── Stage 2: Collection ────────────────────────────────────

export const FactSchema = z.object({
  statement: z.string(),
  sources: z.array(z.string()).min(1),
  source_tier: z.number().min(1).max(3).optional(),
  date: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type Fact = z.infer<typeof FactSchema>;

export const AgentResultSchema = z.object({
  agent: z.string(),
  facts: z.array(FactSchema),
  insights: z.array(z.string()),
  raw_links: z.array(z.string()),
  gaps: z.array(z.string()),
});

export const CollectionResultSchema = z.object({
  agents: z.array(AgentResultSchema).min(1),
});
export type CollectionResult = z.infer<typeof CollectionResultSchema>;

// ─── Stage 3: Fact Check ────────────────────────────────────

export const FactCheckResultSchema = z.object({
  verified_facts: z.array(FactSchema),
  unverified_facts: z.array(FactSchema.extend({ reason: z.string() })),
  rejected_facts: z.array(z.object({ statement: z.string(), reason: z.string() })),
  verification_stats: z.object({
    total: z.number(),
    verified: z.number(),
    unverified: z.number(),
    rejected: z.number(),
  }),
});
export type FactCheckResult = z.infer<typeof FactCheckResultSchema>;

// ─── Stage 4: Synthesis ─────────────────────────────────────

export const SynthesisResultSchema = z.object({
  executive_summary: z.string().min(50),
  key_findings: z.array(z.object({
    finding: z.string(),
    sources: z.array(z.string()),
  })),
  recommendations: z.array(z.string()).min(3),
  market_map: z.string().optional(),
  decision_framework: z.string().optional(),
  gaps_for_deepdive: z.array(z.string()).optional(),
  uncertainties: z.array(z.string()).optional(),
});
export type SynthesisResult = z.infer<typeof SynthesisResultSchema>;

// ─── Stage 5: Devil's Advocate ──────────────────────────────

export const DevilsAdvocateSchema = z.object({
  risks: z.array(z.object({
    risk: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    mitigation: z.string(),
  })).min(1),
  counterarguments: z.array(z.string()),
  blind_spots: z.array(z.string()),
  alternative_interpretations: z.array(z.string()),
});
export type DevilsAdvocateResult = z.infer<typeof DevilsAdvocateSchema>;

// ─── Stage 6: Report ────────────────────────────────────────

export const ReportResultSchema = z.object({
  notion_url: z.string(),
  page_id: z.string(),
  block_count: z.number().min(1),
});
export type ReportResult = z.infer<typeof ReportResultSchema>;

// ─── Stage 7: Review (Consilium) ────────────────────────────

export const ModelReviewSchema = z.object({
  model: z.string(),
  score: z.number().min(0).max(100),
  verdict: z.enum(['approved', 'needs_revision', 'rejected']),
  scores: z.object({
    completeness: z.number(),
    accuracy: z.number(),
    sources: z.number(),
    actionability: z.number(),
    structure: z.number(),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  suggestions: z.array(z.string()),
});
export type ModelReview = z.infer<typeof ModelReviewSchema>;

export const ConsiliumResultSchema = z.object({
  final_verdict: z.enum(['approved', 'needs_revision', 'rejected']),
  consensus_score: z.number(),
  model_scores: z.record(z.number()),
  critical_issues: z.array(z.object({
    issue: z.string(),
    found_by: z.array(z.string()),
  })),
  unified_tz: z.string().optional(),
});
export type ConsiliumResult = z.infer<typeof ConsiliumResultSchema>;

// ─── Pipeline State ─────────────────────────────────────────

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
});
export type PipelineState = z.infer<typeof PipelineStateSchema>;

// ─── Gate Result ────────────────────────────────────────────

export interface GateResult {
  passed: boolean;
  reason?: string;
}

// ─── LLM Call ───────────────────────────────────────────────

export interface LLMCallOptions {
  provider: 'claude' | 'openai' | 'groq';
  prompt: string;
  input: string;
  outputSchema?: z.ZodSchema;
  maxRetries?: number;
  timeoutMs?: number;
  allowedTools?: string[];
}

// ─── Stage Interface ────────────────────────────────────────

export interface StageExecutor {
  execute(state: PipelineState): Promise<unknown>;
}
