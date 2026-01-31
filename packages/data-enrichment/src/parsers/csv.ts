/**
 * CSV parser — read CSV files into records
 */

import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import type { ParseResult } from './index.js';

export function parseCSV(filePath: string): ParseResult {
  const content = readFileSync(filePath, 'utf-8');
  const delimiter = detectDelimiter(content);

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter,
  }) as Record<string, unknown>[];

  const columns = records.length > 0 ? Object.keys(records[0]) : [];

  return {
    records,
    format: 'csv',
    columns,
    totalCount: records.length,
  };
}

function detectDelimiter(content: string): string {
  const firstLine = content.split('\n')[0] ?? '';
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  const tabs = (firstLine.match(/\t/g) ?? []).length;

  if (tabs > commas && tabs > semicolons) return '\t';
  if (semicolons > commas) return ';';
  return ',';
}
