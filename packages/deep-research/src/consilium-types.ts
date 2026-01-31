/**
 * Consilium type definitions and schemas
 */

import type { ModelReview, ConsiliumResult } from './types.js';

export const REVIEW_SYSTEM = `You are reviewing a research report. Score it 0-100 across 5 criteria (20 points each):
1. Completeness — all aspects of the research brief covered
2. Accuracy — facts verified, no contradictions
3. Sources — adequate quality and quantity
4. Actionability — reader can act on recommendations without further research
5. Structure — logical, readable, well-organized

Return JSON matching this schema:
{
  "model": "<your model name>",
  "score": <0-100>,
  "verdict": "approved" | "needs_revision" | "rejected",
  "scores": { "completeness": N, "accuracy": N, "sources": N, "actionability": N, "structure": N },
  "strengths": ["..."],
  "weaknesses": ["..."],
  "suggestions": ["..."]
}

Verdict rules: score >= 80 → approved, 60-79 → needs_revision, < 60 → rejected.`;

export { ModelReview, ConsiliumResult };
