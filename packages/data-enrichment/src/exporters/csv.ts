/**
 * CSV exporter — write records to CSV with atomic write
 */

import { writeFileSync, renameSync, statSync } from 'fs';
import { stringify } from 'csv-stringify/sync';

export function exportCSV(
  records: Record<string, unknown>[],
  outputPath: string,
): { size_bytes: number } {
  if (records.length === 0) {
    throw new Error('No records to export');
  }

  const columns = Object.keys(records[0]);
  const output = stringify(records, {
    header: true,
    columns,
  });

  // Atomic write
  const tmp = `${outputPath}.tmp`;
  writeFileSync(tmp, output);
  renameSync(tmp, outputPath);

  const { size } = statSync(outputPath);
  return { size_bytes: size };
}
