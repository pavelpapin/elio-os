#!/usr/bin/env npx tsx
/**
 * Save Report to Notion
 *
 * Creates a Notion page from a markdown report file.
 *
 * Usage: npx tsx scripts/save-report-to-notion/index.ts <report-type> <date>
 * Example: npx tsx scripts/save-report-to-notion/index.ts cto 2026-01-22
 */

import * as fs from 'fs';
import { markdownToBlocks } from './markdown-to-blocks.js';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

const REPORT_DATABASES: Record<string, string> = {
  cto: '2ee33fbf-b00e-81c2-88ee-ffa070b82eb7',
  cpo: '2ef33fbf-b00e-818a-8268-df1d1449448b',
  ceo: '2ef33fbf-b00e-8191-bfb6-c6c9ac166423'
};

function getNotionKey(): string {
  const path = '/root/.claude/secrets/notion.json';
  if (!fs.existsSync(path)) {
    throw new Error('Notion credentials not found');
  }
  const creds = JSON.parse(fs.readFileSync(path, 'utf-8'));
  return creds.api_key;
}

async function notionRequest(
  endpoint: string,
  method: string = 'GET',
  body?: unknown
): Promise<unknown> {
  const apiKey = getNotionKey();

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

async function createReportPage(
  reportType: string,
  date: string,
  _title: string,
  markdown: string
): Promise<{ url: string }> {
  const dbId = REPORT_DATABASES[reportType];
  if (!dbId) {
    throw new Error(`Unknown report type: ${reportType}. Valid types: ${Object.keys(REPORT_DATABASES).join(', ')}`);
  }

  const blocks = markdownToBlocks(markdown);

  const properties: Record<string, unknown> = {
    'Date': {
      title: [{ type: 'text', text: { content: date } }]
    },
    'Status': {
      select: { name: 'Completed' }
    }
  };

  if (reportType === 'cto') {
    properties['Auto-Fixes Applied'] = { number: 1 };
  } else if (reportType === 'cpo') {
    properties['Auto-Fixes Applied'] = { number: 0 };
    properties['Proposals'] = { number: 4 };
  } else if (reportType === 'ceo') {
    properties['Mission Progress'] = { select: { name: 'Advancing' } };
    properties['Team Health'] = { select: { name: 'Healthy' } };
  }

  const page = await notionRequest('/pages', 'POST', {
    parent: { database_id: dbId },
    properties,
    children: blocks
  }) as { url: string };

  return { url: page.url };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npx tsx scripts/save-report-to-notion/index.ts <report-type> <date>');
    console.log('Example: npx tsx scripts/save-report-to-notion/index.ts cto 2026-01-22');
    console.log('Report types: cto, cpo, ceo');
    process.exit(1);
  }

  const [reportType, date] = args;
  const reportPath = `/root/.claude/logs/team/${reportType}/${date}.md`;

  if (!fs.existsSync(reportPath)) {
    console.error(`❌ Report not found: ${reportPath}`);
    process.exit(1);
  }

  console.log(`📄 Reading report: ${reportPath}`);
  const markdown = fs.readFileSync(reportPath, 'utf-8');

  const firstLine = markdown.split('\n')[0];
  const title = firstLine.startsWith('#') ? firstLine.replace(/^#+\s*/, '') : `${reportType.toUpperCase()} Report - ${date}`;

  console.log(`📤 Creating Notion page: ${title}`);

  try {
    const { url } = await createReportPage(reportType, date, title, markdown);
    console.log(`✅ Created: ${url}`);

    const notionUrlsPath = `/root/.claude/state/notion-urls.json`;
    let notionUrls: Record<string, Record<string, string>> = {};
    if (fs.existsSync(notionUrlsPath)) {
      try {
        notionUrls = JSON.parse(fs.readFileSync(notionUrlsPath, 'utf-8'));
      } catch {
        notionUrls = {};
      }
    }
    if (!notionUrls[date]) notionUrls[date] = {};
    notionUrls[date][reportType] = url;
    fs.writeFileSync(notionUrlsPath, JSON.stringify(notionUrls, null, 2));
    console.log(`📝 Saved URL to state`);
  } catch (error) {
    console.error(`❌ Failed:`, error);
    process.exit(1);
  }
}

main();
