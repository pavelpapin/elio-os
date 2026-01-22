/**
 * Notion Page Verifier
 * Validates Notion pages have expected content and structure
 */

import { readFileSync } from 'fs';
import type { VerifyConfig, VerifyResult } from '../types.js';

const NOTION_VERSION = '2022-06-28';
const NOTION_TOKEN_PATH = '/root/.claude/secrets/notion-token.json';

function getNotionToken(): string | null {
  try {
    const data = readFileSync(NOTION_TOKEN_PATH, 'utf-8');
    return JSON.parse(data).api_key;
  } catch {
    return null;
  }
}

interface NotionPage {
  url: string;
  properties: Record<string, unknown>;
}

interface NotionBlock {
  type: string;
  [key: string]: unknown;
}

interface NotionBlocksResponse {
  results: NotionBlock[];
}

/**
 * Verify Notion page exists and has expected content
 */
export async function verifyNotionPage(config: VerifyConfig): Promise<VerifyResult> {
  const token = getNotionToken();
  if (!token) {
    return { ok: false, error: 'Notion token not found' };
  }

  const pageId = config.pageId;
  if (!pageId) {
    return { ok: false, error: 'pageId required' };
  }

  try {
    const page = await fetchPage(token, pageId);
    if (!page.ok) return page;

    const blocks = await fetchBlocks(token, pageId);
    if (!blocks.ok) return blocks;

    const blockCount = blocks.data?.length || 0;

    if (config.minBlocks && blockCount < config.minBlocks) {
      return {
        ok: false,
        error: `Content too short: ${blockCount} blocks, expected at least ${config.minBlocks}`,
        details: { actualBlocks: blockCount }
      };
    }

    if (config.requiredHeadings && config.requiredHeadings.length > 0) {
      const headingCheck = checkRequiredHeadings(blocks.data || [], config.requiredHeadings);
      if (!headingCheck.ok) return headingCheck;
    }

    if (config.expectedProperties) {
      const propCheck = checkExpectedProperties(page.data!, config.expectedProperties);
      if (!propCheck.ok) return propCheck;
    }

    return {
      ok: true,
      url: page.data?.url,
      details: {
        blocksCount: blockCount,
        properties: Object.keys(page.data?.properties || {})
      }
    };
  } catch (error) {
    return { ok: false, error: `Verification failed: ${error}` };
  }
}

async function fetchPage(
  token: string,
  pageId: string
): Promise<VerifyResult & { data?: NotionPage }> {
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION
    }
  });

  if (!response.ok) {
    const error = await response.text();
    return { ok: false, error: `Page not found: ${error}` };
  }

  const page = await response.json() as NotionPage;
  return { ok: true, data: page };
}

async function fetchBlocks(
  token: string,
  pageId: string
): Promise<VerifyResult & { data?: NotionBlock[] }> {
  const response = await fetch(
    `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION
      }
    }
  );

  if (!response.ok) {
    return { ok: false, error: 'Failed to fetch page blocks' };
  }

  const data = await response.json() as NotionBlocksResponse;
  return { ok: true, data: data.results };
}

function checkRequiredHeadings(blocks: NotionBlock[], required: string[]): VerifyResult {
  const headings: string[] = [];

  for (const block of blocks) {
    if (block.type?.startsWith('heading')) {
      const headingData = block[block.type] as { rich_text?: Array<{ plain_text: string }> };
      if (headingData?.rich_text) {
        const text = headingData.rich_text.map(t => t.plain_text).join('');
        headings.push(text);
      }
    }
  }

  const missing: string[] = [];
  for (const req of required) {
    const found = headings.some(h => h.toLowerCase().includes(req.toLowerCase()));
    if (!found) {
      missing.push(req);
    }
  }

  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing required sections: ${missing.join(', ')}`,
      details: { foundHeadings: headings, missing }
    };
  }

  return { ok: true };
}

function checkExpectedProperties(
  page: NotionPage,
  expected: Record<string, unknown>
): VerifyResult {
  for (const key of Object.keys(expected)) {
    if (!page.properties[key]) {
      return {
        ok: false,
        error: `Missing property: ${key}`,
        details: { expectedProperties: Object.keys(expected) }
      };
    }
  }
  return { ok: true };
}
