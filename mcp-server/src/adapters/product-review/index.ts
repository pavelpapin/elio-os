/**
 * Product Review Adapter
 * Exposes product review capabilities as MCP tools
 */

import { z } from 'zod';
import { Adapter, AdapterTool } from '../../gateway/types.js';
import {
  runProductReview,
  calculateQualityScore,
  formatAsMarkdown,
} from '@elio/product-review';
import type { FeedbackItem, QualityMetrics } from '@elio/product-review';

// Schemas
const reviewSchema = z.object({
  scope: z.enum(['full', 'feedback', 'errors', 'quality']).optional()
    .describe('What to review (default: full)'),
  since: z.string().optional().describe('Time period: 24h, 7d, etc (default: 24h)'),
  output: z.enum(['markdown', 'json']).optional().describe('Output format (default: markdown)'),
});

const feedbackSchema = z.object({
  feedback: z.array(z.object({
    id: z.string(),
    type: z.enum(['correction', 'complaint', 'request']),
    content: z.string(),
    timestamp: z.string(),
    source: z.string(),
  })).describe('Feedback items to analyze'),
});

const scoreSchema = z.object({
  accuracy: z.number().min(0).max(100).describe('Accuracy score 0-100'),
  completeness: z.number().min(0).max(100).describe('Completeness score 0-100'),
  latency: z.number().min(0).describe('Average latency in ms'),
  satisfaction: z.number().min(0).max(100).describe('Satisfaction score 0-100'),
});

const tools: AdapterTool[] = [
  {
    name: 'review',
    description: 'Run product quality review - analyzes feedback, errors, quality metrics',
    type: 'read',
    schema: reviewSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof reviewSchema>;

      const result = await runProductReview({
        scope: p.scope,
        since: p.since,
      });

      if (p.output === 'json') {
        return JSON.stringify(result, null, 2);
      }

      return formatAsMarkdown(result);
    },
  },
  {
    name: 'analyze_feedback',
    description: 'Analyze specific feedback items for patterns and pain points',
    type: 'read',
    schema: feedbackSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof feedbackSchema>;

      const result = await runProductReview(
        { scope: 'feedback' },
        { feedback: p.feedback as FeedbackItem[] }
      );

      return formatAsMarkdown(result);
    },
  },
  {
    name: 'calculate_score',
    description: 'Calculate quality score from metrics',
    type: 'read',
    schema: scoreSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof scoreSchema>;

      const metrics: QualityMetrics = {
        accuracy: p.accuracy,
        completeness: p.completeness,
        latency: p.latency,
        satisfaction: p.satisfaction,
      };

      const score = calculateQualityScore(metrics);
      const level =
        score >= 90
          ? 'excellent'
          : score >= 70
          ? 'good'
          : score >= 50
          ? 'warning'
          : score >= 30
          ? 'poor'
          : 'critical';

      return JSON.stringify({ score, level, metrics }, null, 2);
    },
  },
];

export const productReviewAdapter: Adapter = {
  name: 'product-review',
  isAuthenticated: () => true,
  tools,
};

export default productReviewAdapter;
