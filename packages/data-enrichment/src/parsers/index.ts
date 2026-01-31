/**
 * Universal input parser — auto-detect format and dispatch
 */

import { parseCSV } from './csv.js';
import { parseJSON } from './json.js';
import { parseNotionDB } from './notion.js';

export interface ParseResult {
  records: Record<string, unknown>[];
  format: 'csv' | 'json' | 'notion';
  columns: string[];
  totalCount: number;
}

export async function parseInput(source: string): Promise<ParseResult> {
  if (source.includes('notion.so') || source.startsWith('notion:')) {
    return parseNotionDB(source);
  }

  if (source.endsWith('.json')) {
    return parseJSON(source);
  }

  if (source.endsWith('.csv') || source.endsWith('.tsv')) {
    return parseCSV(source);
  }

  // Try JSON first, fallback to CSV
  try {
    return await parseJSON(source);
  } catch {
    return parseCSV(source);
  }
}
