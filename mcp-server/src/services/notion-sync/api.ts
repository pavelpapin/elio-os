/**
 * Notion Sync - API Functions
 */

import { NOTION_API, NOTION_VERSION } from './config.js';

/**
 * Get Notion API key from secrets
 */
export async function getApiKey(): Promise<string> {
  const fs = await import('fs');
  const path = '/root/.claude/secrets/notion.json';

  if (!fs.existsSync(path)) {
    throw new Error('Notion credentials not found');
  }

  const creds = JSON.parse(fs.readFileSync(path, 'utf-8'));
  return creds.api_key;
}

/**
 * Make Notion API request
 */
export async function notionRequest(
  endpoint: string,
  method: string = 'GET',
  body?: unknown
): Promise<unknown> {
  const apiKey = await getApiKey();

  const response = await fetch(`${NOTION_API}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${error}`);
  }

  return response.json();
}
