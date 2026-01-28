/**
 * System Review Adapter
 * Exposes system review capabilities as MCP tools
 */

import { z } from 'zod';
import { Adapter, AdapterTool } from '../../gateway/types.js';
import {
  runSystemReview,
  getInfraMetrics,
  formatAsMarkdown,
} from '@elio/system-review';

// Schemas
const reviewSchema = z.object({
  scope: z.enum(['full', 'code', 'architecture', 'security', 'infra']).optional()
    .describe('What to review (default: full)'),
  since: z.string().optional().describe('Time period: 24h, 7d, etc (default: 24h)'),
  path: z.string().optional().describe('Path to review (default: /root/.claude)'),
  output: z.enum(['markdown', 'json']).optional().describe('Output format (default: markdown)'),
});

const infraSchema = z.object({});

const tools: AdapterTool[] = [
  {
    name: 'review',
    description: 'Run system health review - code, architecture, security, infrastructure',
    type: 'read',
    schema: reviewSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof reviewSchema>;

      const result = await runSystemReview({
        scope: p.scope,
        since: p.since,
        targetPath: p.path,
      });

      if (p.output === 'json') {
        return JSON.stringify(result, null, 2);
      }

      return formatAsMarkdown(result);
    },
  },
  {
    name: 'infra_check',
    description: 'Check infrastructure metrics (disk, RAM, swap, services)',
    type: 'read',
    schema: infraSchema,
    execute: async () => {
      const metrics = getInfraMetrics();

      const lines: string[] = [
        '# Infrastructure Check\n',
        `| Metric | Value | Status |`,
        `|--------|-------|--------|`,
        `| Disk | ${metrics.diskUsagePercent}% | ${metrics.diskUsagePercent >= 90 ? '🔴' : metrics.diskUsagePercent >= 80 ? '🟠' : '🟢'} |`,
        `| RAM | ${metrics.ramUsagePercent}% | ${metrics.ramUsagePercent >= 90 ? '🔴' : metrics.ramUsagePercent >= 80 ? '🟠' : '🟢'} |`,
        `| Swap | ${metrics.swapUsagePercent}% | ${metrics.swapUsagePercent > 0 ? '🟠' : '🟢'} |`,
        `| Uptime | ${metrics.uptimeHours}h | ${metrics.uptimeHours > 0 ? '🟢' : '🔴'} |`,
      ];

      if (metrics.failedServices.length > 0) {
        lines.push(`\n## Failed Services\n`);
        for (const service of metrics.failedServices) {
          lines.push(`- ${service}`);
        }
      }

      return lines.join('\n');
    },
  },
];

export const systemReviewAdapter: Adapter = {
  name: 'system-review',
  isAuthenticated: () => true,
  tools,
};

export default systemReviewAdapter;
