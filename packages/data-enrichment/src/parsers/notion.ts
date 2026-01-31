/**
 * Notion DB parser — fetch records via BullMQ agent-execution
 */

import { createWorkflowClient } from '@elio/workflow';
import type { ParseResult } from './index.js';

export async function parseNotionDB(source: string): Promise<ParseResult> {
  const dbId = extractNotionDbId(source);

  const prompt = `Query the Notion database with ID "${dbId}". Return ALL records as a JSON array of objects. Each object should have the property names as keys and their values as strings. Return ONLY the JSON array.`;

  const client = createWorkflowClient();
  const handle = await client.start('agent-execution', {
    prompt,
    cwd: '/root/.claude',
    requestedBy: 'data-enrichment',
  });

  const result = await handle.result();
  await client.close();

  if (result.status !== 'completed' || !result.output) {
    throw new Error(`Notion query failed: ${result.error || 'No output'}`);
  }

  const output = typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
  const cleaned = output
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const records = JSON.parse(cleaned) as Record<string, unknown>[];
  const columns = records.length > 0 ? Object.keys(records[0]) : [];

  return {
    records,
    format: 'notion',
    columns,
    totalCount: records.length,
  };
}

function extractNotionDbId(source: string): string {
  if (source.startsWith('notion:')) return source.slice(7);

  const match = source.match(/([a-f0-9]{32})/);
  if (match) return match[1];

  const uuidMatch = source.match(/([a-f0-9-]{36})/);
  if (uuidMatch) return uuidMatch[1].replace(/-/g, '');

  return source;
}
