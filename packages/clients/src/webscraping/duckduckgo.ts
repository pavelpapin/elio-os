/**
 * DuckDuckGo Search Functions
 * Uses Python duckduckgo-search library
 * Security: Uses execFile with separate arguments to prevent command injection
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '@elio/shared';
import type { DuckDuckGoResult } from './types.js';
import { validateQuery } from './validation.js';

const execFileAsync = promisify(execFile);
const logger = createLogger('webscraping');

export async function duckduckgoSearch(
  query: string,
  maxResults: number = 10
): Promise<DuckDuckGoResult[]> {
  try {
    validateQuery(query);

    const pythonScript = `
import sys
import json
from duckduckgo_search import DDGS
query = sys.argv[1]
max_results = int(sys.argv[2])
r = DDGS().text(query, max_results=max_results)
print(json.dumps(r))
`;

    const { stdout } = await execFileAsync(
      'python3',
      ['-c', pythonScript, query, String(maxResults)],
      { timeout: 30000 }
    );

    const results = JSON.parse(stdout);
    return results.map((r: { title: string; href: string; body: string }) => ({
      title: r.title,
      url: r.href,
      snippet: r.body
    }));
  } catch (error) {
    logger.error('DuckDuckGo search error', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export async function duckduckgoNews(
  query: string,
  maxResults: number = 10
): Promise<DuckDuckGoResult[]> {
  try {
    validateQuery(query);

    const pythonScript = `
import sys
import json
from duckduckgo_search import DDGS
query = sys.argv[1]
max_results = int(sys.argv[2])
r = DDGS().news(query, max_results=max_results)
print(json.dumps(r))
`;

    const { stdout } = await execFileAsync(
      'python3',
      ['-c', pythonScript, query, String(maxResults)],
      { timeout: 30000 }
    );

    const results = JSON.parse(stdout);
    return results.map((r: { title: string; url: string; body: string }) => ({
      title: r.title,
      url: r.url,
      snippet: r.body
    }));
  } catch (error) {
    logger.error('DuckDuckGo news error', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}
