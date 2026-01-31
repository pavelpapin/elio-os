/**
 * JSON exporter — write records to JSON with atomic write
 */

import { writeFileSync, renameSync, statSync } from 'fs';

export function exportJSON(
  records: Record<string, unknown>[],
  outputPath: string,
): { size_bytes: number } {
  const output = JSON.stringify(records, null, 2);

  // Atomic write
  const tmp = `${outputPath}.tmp`;
  writeFileSync(tmp, output);
  renameSync(tmp, outputPath);

  const { size } = statSync(outputPath);
  return { size_bytes: size };
}
