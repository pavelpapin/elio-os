/**
 * Web Search Skill
 * Searches the web using various providers
 */

import { Skill, WebSearchInput, WebSearchOutput, WebSearchResult } from '../types.js';
import { readJsonFile } from '../runner.js';
import * as https from 'https';

const CREDENTIALS_PATH = '/root/.claude/secrets/serper.json';

interface SerperCredentials {
  api_key?: string;
}

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
}

interface SerperResponse {
  organic?: SerperResult[];
}

async function httpPost(url: string, headers: Record<string, string>, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.write(body);
    req.end();
  });
}

async function searchSerper(query: string, numResults: number, apiKey: string): Promise<WebSearchResult[]> {
  const body = JSON.stringify({
    q: query,
    num: numResults
  });

  const response = await httpPost(
    'https://google.serper.dev/search',
    { 'X-API-KEY': apiKey },
    body
  );

  const data: SerperResponse = JSON.parse(response);

  return (data.organic || []).map(result => ({
    title: result.title,
    url: result.link,
    snippet: result.snippet
  }));
}

async function searchDuckDuckGo(query: string, numResults: number): Promise<WebSearchResult[]> {
  // DuckDuckGo HTML search (simplified, no API key needed)
  return new Promise((resolve) => {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const results: WebSearchResult[] = [];

        // Simple regex parsing of DDG HTML results
        const resultPattern = /<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([^<]+)<\/a>/gi;

        let match;
        while ((match = resultPattern.exec(data)) !== null && results.length < numResults) {
          results.push({
            url: match[1],
            title: match[2].trim(),
            snippet: match[3].trim()
          });
        }

        resolve(results);
      });
    }).on('error', () => resolve([]));
  });
}

export async function execute(input: WebSearchInput): Promise<WebSearchOutput> {
  const { query, numResults = 10, site } = input;

  const searchQuery = site ? `${query} site:${site}` : query;
  const creds = readJsonFile<SerperCredentials>(CREDENTIALS_PATH);

  // Try Serper first if API key available
  if (creds?.api_key) {
    try {
      const results = await searchSerper(searchQuery, numResults, creds.api_key);
      return {
        query,
        results,
        total: results.length,
        source: 'serper'
      };
    } catch (error) {
      // Fall through to DuckDuckGo
    }
  }

  // Fallback to DuckDuckGo
  try {
    const results = await searchDuckDuckGo(searchQuery, numResults);
    return {
      query,
      results,
      total: results.length,
      source: 'duckduckgo'
    };
  } catch {
    return {
      query,
      results: [],
      total: 0,
      source: 'fallback'
    };
  }
}

export const webSearch: Skill<WebSearchInput, WebSearchOutput> = {
  metadata: {
    name: 'web-search',
    version: '1.0.0',
    description: 'Search the web',
    inputs: {
      query: {
        type: 'string',
        required: true,
        description: 'Search query'
      },
      numResults: {
        type: 'number',
        required: false,
        default: 10,
        description: 'Number of results'
      },
      site: {
        type: 'string',
        required: false,
        description: 'Limit to specific site'
      }
    },
    outputs: {
      results: {
        type: 'array',
        description: 'Search results'
      }
    },
    tags: ['search', 'web', 'research'],
    timeout: 60
  },
  execute
};

export { webSearch };
