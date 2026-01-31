/**
 * Nightly Health Checks
 */

import { readFileSync, existsSync } from 'fs';

export interface HealthCheckResult {
  source: string;
  status: 'ok' | 'degraded' | 'failed';
  latencyMs?: number;
  error?: string;
  testedAt: string;
}

/**
 * Run health check for a data source
 */
export async function checkSourceHealth(source: string): Promise<HealthCheckResult> {
  const start = Date.now();
  const result: HealthCheckResult = {
    source,
    status: 'failed',
    testedAt: new Date().toISOString()
  };

  try {
    switch (source) {
      case 'perplexity': {
        const configPath = '/root/.claude/secrets/perplexity.json';
        if (!existsSync(configPath)) {
          result.error = 'Config not found';
          break;
        }
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        if (!config.api_key) {
          result.error = 'API key missing';
          break;
        }
        // Simple connectivity test
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.api_key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1
          })
        });
        result.status = response.ok ? 'ok' : 'degraded';
        if (!response.ok) result.error = `HTTP ${response.status}`;
        break;
      }

      case 'jina': {
        const response = await fetch('https://r.jina.ai/https://example.com', {
          headers: { 'Accept': 'text/plain' }
        });
        result.status = response.ok ? 'ok' : 'degraded';
        if (!response.ok) result.error = `HTTP ${response.status}`;
        break;
      }

      case 'ddg': {
        // DuckDuckGo doesn't have API, just check if it responds
        const response = await fetch('https://duckduckgo.com/', {
          method: 'HEAD'
        });
        result.status = response.ok ? 'ok' : 'degraded';
        break;
      }

      case 'google_news': {
        const response = await fetch(
          'https://news.google.com/rss/search?q=test&hl=en-US&gl=US&ceid=US:en'
        );
        result.status = response.ok ? 'ok' : 'degraded';
        if (!response.ok) result.error = `HTTP ${response.status}`;
        break;
      }

      case 'youtube': {
        // Check if youtube-transcript service works
        // This is a simplified check
        const response = await fetch('https://www.youtube.com/', {
          method: 'HEAD'
        });
        result.status = response.ok ? 'ok' : 'degraded';
        break;
      }

      case 'linkedin': {
        const cookiePath = '/root/.claude/secrets/linkedin-cookie.json';
        if (!existsSync(cookiePath)) {
          result.status = 'failed';
          result.error = 'Cookie not found';
          break;
        }
        const cookie = JSON.parse(readFileSync(cookiePath, 'utf-8'));
        if (!cookie.li_at) {
          result.status = 'failed';
          result.error = 'li_at cookie missing';
          break;
        }
        // We know API access is limited, so just check cookie exists
        result.status = 'degraded';
        result.error = 'API limited to own profile only';
        break;
      }

      default:
        result.error = 'Unknown source';
    }
  } catch (error) {
    result.status = 'failed';
    result.error = error instanceof Error ? error.message : 'Unknown error';
  }

  result.latencyMs = Date.now() - start;
  return result;
}
