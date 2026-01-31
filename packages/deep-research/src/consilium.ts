/**
 * Consilium — multi-model review with deterministic vote synthesis
 */

import { callLLM, hasProvider } from './llm.js';
import { ModelReviewSchema, ConsiliumResultSchema } from './types.js';
import type { ModelReview, ConsiliumResult, ResearchBrief } from './types.js';
import { REVIEW_SYSTEM } from './consilium-types.js';

export async function runConsilium(
  reportContent: string,
  brief: ResearchBrief,
): Promise<ConsiliumResult> {
  const input = JSON.stringify({
    report: reportContent,
    research_brief: { topic: brief.topic, goal: brief.goal, success_criteria: brief.success_criteria },
  });

  // Determine which models are available
  const providers: Array<'claude' | 'openai' | 'groq'> = ['claude'];
  if (hasProvider('openai')) providers.push('openai');
  if (hasProvider('groq')) providers.push('groq');

  // Round 1: Independent reviews (parallel)
  const round1Results = await Promise.allSettled(
    providers.map((provider) =>
      callLLM({
        provider,
        prompt: REVIEW_SYSTEM,
        input,
        outputSchema: ModelReviewSchema,
        timeoutMs: 120_000,
      }) as Promise<ModelReview>,
    ),
  );

  const reviews: ModelReview[] = round1Results
    .filter((r): r is PromiseFulfilledResult<ModelReview> => r.status === 'fulfilled')
    .map((r) => r.value);

  if (reviews.length === 0) {
    // Total failure — force manual review instead of auto-approving
    return {
      final_verdict: 'needs_revision',
      consensus_score: 0,
      model_scores: {},
      critical_issues: [{
        issue: 'CRITICAL: All review models failed - research not validated',
        found_by: ['system']
      }],
      unified_tz: 'All review models failed. Manual review required before proceeding.',
    };
  }

  if (reviews.length === 1) {
    return singleReview(reviews[0]);
  }

  // Round 2: Cross-review (skip if only 2 models — diminishing returns)
  // Round 3: Deterministic synthesis
  return synthesize(reviews);
}

function singleReview(review: ModelReview): ConsiliumResult {
  return {
    final_verdict: review.verdict,
    consensus_score: review.score,
    model_scores: { [review.model]: review.score },
    critical_issues: review.weaknesses.map((w) => ({
      issue: w,
      found_by: [review.model],
    })),
    unified_tz: review.suggestions.join('\n'),
  };
}

function synthesize(reviews: ModelReview[]): ConsiliumResult {
  // Majority vote
  const verdicts = reviews.map((r) => r.verdict);
  const approved = verdicts.filter((v) => v === 'approved').length;
  const rejected = verdicts.filter((v) => v === 'rejected').length;

  let final_verdict: 'approved' | 'needs_revision' | 'rejected';
  if (rejected >= 2) final_verdict = 'rejected';
  else if (approved >= 2) final_verdict = 'approved';
  else final_verdict = 'needs_revision';

  // Scores
  const scores = Object.fromEntries(reviews.map((r) => [r.model, r.score]));
  const avgScore = reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length;

  // Collect weaknesses mentioned by 2+ models
  const weaknessCount = new Map<string, string[]>();
  for (const review of reviews) {
    for (const w of review.weaknesses) {
      const key = w.toLowerCase().slice(0, 50); // rough dedup
      if (!weaknessCount.has(key)) weaknessCount.set(key, []);
      weaknessCount.get(key)!.push(review.model);
    }
  }

  const critical = [...weaknessCount.entries()]
    .filter(([, models]) => models.length >= 2)
    .map(([issue, models]) => ({ issue, found_by: models }));

  // Unified TZ from all suggestions
  const allSuggestions = reviews.flatMap((r) => r.suggestions);
  const unified_tz = allSuggestions.length > 0 ? allSuggestions.join('\n') : undefined;

  return ConsiliumResultSchema.parse({
    final_verdict,
    consensus_score: Math.round(avgScore),
    model_scores: scores,
    critical_issues: critical,
    unified_tz,
  });
}
