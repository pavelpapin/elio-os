/**
 * Grok Adapter
 * xAI's Grok model for chat and research
 */

import { z } from 'zod';
import { Adapter, AdapterTool } from '../../gateway/types.js';
import * as grok from '@elio/clients/grok';
import { withRateLimit } from '../../utils/rate-limiter.js';
import { withCircuitBreaker } from '../../utils/circuit-breaker.js';

const chatSchema = z.object({
  message: z.string().describe('Message to send to Grok'),
  system: z.string().optional().describe('System prompt'),
});

const researchSchema = z.object({
  topic: z.string().describe('Research topic'),
  focus: z.enum(['twitter', 'news', 'general']).optional()
    .describe('Research focus (default: general)'),
  depth: z.enum(['quick', 'detailed']).optional()
    .describe('Research depth (default: detailed)'),
});

const trendsSchema = z.object({
  topic: z.string().describe('Topic to analyze trends for'),
  timeframe: z.enum(['24h', '7d', '30d']).optional()
    .describe('Timeframe for trend analysis (default: 7d)'),
});

const expertsSchema = z.object({
  topic: z.string().describe('Topic to find expert opinions on'),
  count: z.number().optional().describe('Number of opinions (default: 5)'),
});

const tools: AdapterTool[] = [
  {
    name: 'chat',
    description: 'Chat with Grok (xAI). Fast, witty, real-time knowledge.',
    type: 'read',
    schema: chatSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof chatSchema>;
      const messages = p.system
        ? [{ role: 'system' as const, content: p.system }, { role: 'user' as const, content: p.message }]
        : [{ role: 'user' as const, content: p.message }];

      const result = await withCircuitBreaker('grok', () =>
        withRateLimit('grok', () => grok.chat(messages))
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'research',
    description: 'Deep research via Grok with real-time X/Twitter data.',
    type: 'read',
    schema: researchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof researchSchema>;
      const result = await withCircuitBreaker('grok', () =>
        withRateLimit('grok', () =>
          grok.research(p.topic, { focus: p.focus, depth: p.depth })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'trends',
    description: 'Analyze trends on a topic via Grok.',
    type: 'read',
    schema: trendsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof trendsSchema>;
      const result = await withCircuitBreaker('grok', () =>
        withRateLimit('grok', () =>
          grok.analyzeTrends(p.topic, { timeframe: p.timeframe })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  },
  {
    name: 'experts',
    description: 'Get expert opinions on a topic via Grok.',
    type: 'read',
    schema: expertsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof expertsSchema>;
      const result = await withCircuitBreaker('grok', () =>
        withRateLimit('grok', () =>
          grok.getExpertOpinions(p.topic, { count: p.count })
        )
      );
      return JSON.stringify(result, null, 2);
    }
  }
];

export const grokAdapter: Adapter = {
  name: 'grok',
  isAuthenticated: grok.isAuthenticated,
  tools
};
