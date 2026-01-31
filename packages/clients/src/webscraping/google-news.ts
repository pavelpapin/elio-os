/**
 * Google News RSS - Free unlimited news
 * Security: Uses execFile with separate arguments
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '@elio/shared';
import type { GoogleNewsResult } from './types.js';
import { validateQuery } from './validation.js';

const execFileAsync = promisify(execFile);
const logger = createLogger('webscraping');

export async function googleNewsRss(
  query: string,
  maxResults: number = 10
): Promise<GoogleNewsResult[]> {
  try {
    validateQuery(query);

    const encodedQuery = encodeURIComponent(query);
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;

    const pythonScript = `
import sys
import json
import feedparser
url = sys.argv[1]
max_results = int(sys.argv[2])
f = feedparser.parse(url)
result = [{'title': e.title, 'url': e.link, 'published': e.get('published', ''), 'source': e.get('source', {}).get('title', '')} for e in f.entries[:max_results]]
print(json.dumps(result))
`;

    const { stdout } = await execFileAsync(
      'python3',
      ['-c', pythonScript, rssUrl, String(maxResults)],
      { timeout: 30000 }
    );

    return JSON.parse(stdout);
  } catch (error) {
    logger.error('Google News RSS error', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}
