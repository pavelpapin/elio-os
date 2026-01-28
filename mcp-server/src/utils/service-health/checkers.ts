/**
 * Service Health Checkers
 */

import { httpProbe } from './probe.js';
import type { ServiceChecker, ServiceHealthResult } from './types.js';

function createSimpleChecker(name: string, url: string, options?: {
  headers?: Record<string, string>;
  timeout?: number;
}): ServiceChecker {
  return {
    name,
    check: async (): Promise<ServiceHealthResult> => {
      const result = await httpProbe(url, options);
      return {
        service: name,
        status: result.ok ? 'healthy' : 'unhealthy',
        latency_ms: result.latency_ms,
        message: result.error,
        last_check: new Date().toISOString()
      };
    }
  };
}

export const serviceCheckers: ServiceChecker[] = [
  createSimpleChecker('google-apis', 'https://www.googleapis.com/discovery/v1/apis'),
  createSimpleChecker('perplexity', 'https://api.perplexity.ai', { timeout: 3000 }),
  createSimpleChecker('notion', 'https://api.notion.com/v1'),
  createSimpleChecker('telegram', 'https://api.telegram.org'),
  createSimpleChecker('slack', 'https://slack.com/api/api.test'),
  createSimpleChecker('github', 'https://api.github.com'),
  createSimpleChecker('youtube', 'https://www.googleapis.com/youtube/v3'),
  createSimpleChecker('brave', 'https://api.search.brave.com'),
  createSimpleChecker('serper', 'https://google.serper.dev'),
  createSimpleChecker('tavily', 'https://api.tavily.com'),
  createSimpleChecker('exa', 'https://api.exa.ai'),
  createSimpleChecker('semantic-scholar', 'https://api.semanticscholar.org/graph/v1'),
  createSimpleChecker('reddit', 'https://www.reddit.com/r/programming/.json?limit=1', {
    headers: { 'User-Agent': 'Elio/1.0' }
  }),
  createSimpleChecker('hackernews', 'https://hacker-news.firebaseio.com/v0/topstories.json'),

  // Supabase - special case with config file
  {
    name: 'supabase',
    check: async (): Promise<ServiceHealthResult> => {
      try {
        const fs = await import('fs');
        const configPath = '/root/.claude/secrets/supabase.json';
        if (!fs.existsSync(configPath)) {
          return {
            service: 'supabase',
            status: 'unconfigured',
            message: 'No credentials found',
            last_check: new Date().toISOString()
          };
        }
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (!config.url) {
          return {
            service: 'supabase',
            status: 'unconfigured',
            message: 'No URL configured',
            last_check: new Date().toISOString()
          };
        }
        const result = await httpProbe(`${config.url}/rest/v1/`);
        return {
          service: 'supabase',
          status: result.ok ? 'healthy' : 'unhealthy',
          latency_ms: result.latency_ms,
          message: result.error,
          last_check: new Date().toISOString()
        };
      } catch (error) {
        return {
          service: 'supabase',
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
          last_check: new Date().toISOString()
        };
      }
    }
  }
];
