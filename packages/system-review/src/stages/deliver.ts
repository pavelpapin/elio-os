/**
 * Stage: Deliver — publish report to Notion + send Telegram summary
 */

import { readFileSync } from 'fs';
import type { ExecutionContext } from '../orchestrator/types.js';

const NOTION_DB_ID = '2ee33fbf-b00e-81c2-88ee-ffa070b82eb7';

interface ReportData {
  reportPath: string;
  telegram: string;
  score: number;
  markdown: string;
}

function loadNotionKey(): string | null {
  try {
    const raw = readFileSync('/root/.claude/secrets/notion.json', 'utf-8');
    return JSON.parse(raw).api_key ?? null;
  } catch {
    return null;
  }
}

function markdownToBlocks(md: string): unknown[] {
  const lines = md.split('\n');
  const blocks: unknown[] = [];

  for (const line of lines) {
    if (line.startsWith('# ')) {
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: line.slice(2) } }] } });
    } else if (line.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: line.slice(3) } }] } });
    } else if (line.startsWith('### ')) {
      blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: line.slice(4) } }] } });
    } else if (line.startsWith('```')) {
      continue;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ type: 'text', text: { content: line.slice(2) } }] } });
    } else if (line.trim()) {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: line } }] } });
    }
  }

  return blocks.slice(0, 100);
}

async function createNotionPage(title: string, markdown: string, score: number, apiKey: string): Promise<string | null> {
  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: NOTION_DB_ID },
      properties: {
        Date: { title: [{ text: { content: title } }] },
        'Overall Score': { number: score },
        'Status': { select: { name: score >= 70 ? 'Healthy' : score >= 30 ? 'Needs Attention' : 'Critical' } },
      },
      children: markdownToBlocks(markdown),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion API ${res.status}: ${err}`);
  }

  const data = await res.json() as { url?: string };
  return data.url ?? null;
}

async function sendTelegram(msg: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
  });
  return res.ok;
}

export async function executeDeliver(ctx: ExecutionContext): Promise<unknown> {
  const reportData = ctx.stageOutputs.get('report')?.data as ReportData | undefined;
  if (!reportData) throw new Error('Report output not found');

  ctx.logger.info('Delivering report');

  // 1. Notion
  let notionUrl: string | undefined;
  const apiKey = loadNotionKey();
  if (apiKey) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const title = `System Review ${date} — Score: ${reportData.score}/100`;
      const url = await createNotionPage(title, reportData.markdown, reportData.score, apiKey);
      notionUrl = url ?? undefined;
      ctx.logger.info('Notion page created', { url: notionUrl });
    } catch (err) {
      ctx.logger.warn('Notion delivery failed', { error: String(err) });
    }
  } else {
    ctx.logger.warn('Notion API key not found, skipping');
  }

  // 2. Telegram (include Notion link if available)
  let telegramSent = false;
  const telegramMsg = notionUrl
    ? `${reportData.telegram}\n\n${notionUrl}`
    : reportData.telegram;
  try {
    telegramSent = await sendTelegram(telegramMsg);
    ctx.logger.info('Telegram sent', { success: telegramSent });
  } catch (err) {
    ctx.logger.warn('Telegram delivery failed', { error: String(err) });
  }

  return {
    reportPath: reportData.reportPath,
    telegramSent,
    notionUrl,
  };
}
