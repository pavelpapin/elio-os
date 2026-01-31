/**
 * JSON parser — read JSON files into records
 */

import { readFileSync } from 'fs';
import type { ParseResult } from './index.js';

export function parseJSON(filePath: string): ParseResult {
  const content = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  const records = Array.isArray(data) ? data : [data];

  if (records.length === 0) {
    throw new Error('JSON file contains no records');
  }

  const columns = Object.keys(records[0] as Record<string, unknown>);

  return {
    records: records as Record<string, unknown>[],
    format: 'json',
    columns,
    totalCount: records.length,
  };
}
