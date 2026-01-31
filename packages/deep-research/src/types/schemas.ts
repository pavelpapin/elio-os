/**
 * Zod schemas for stage inputs/outputs
 */

import { z } from 'zod';

export const STAGE_NAMES = [
  'discovery', 'planning', 'collection', 'factcheck',
  'synthesis', 'devils_advocate', 'report', 'review',
] as const;

export type StageName = (typeof STAGE_NAMES)[number];

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

export const ReportResultSchema = z.object({
  notion_url: z.string(),
  page_id: z.string(),
  block_count: z.number().min(1),
});
export type ReportResult = z.infer<typeof ReportResultSchema>;

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
