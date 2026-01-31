/**
 * Export dispatcher — write enriched data to CSV or JSON
 */

import { exportCSV } from './csv.js';
import { exportJSON } from './json.js';

export async function exportData(
  records: Record<string, unknown>[],
  format: 'csv' | 'json',
  outputPath: string,
): Promise<{ size_bytes: number }> {
  switch (format) {
    case 'csv': return exportCSV(records, outputPath);
    case 'json': return exportJSON(records, outputPath);
  }
}
