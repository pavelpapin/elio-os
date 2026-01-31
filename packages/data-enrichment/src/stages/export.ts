/**
 * Stage 5: Export — write enriched data to CSV/JSON file
 */

import { mkdirSync } from 'fs';
import { exportData } from '../exporters/index.js';
import { ExportResultSchema } from '../types.js';
import { getRunDir } from '../state.js';
import type { PipelineState } from '../types.js';

export async function execute(state: PipelineState): Promise<unknown> {
  const synthesis = state.stage_outputs.synthesis!;
  const brief = state.stage_outputs.discovery!;
  const format = brief.output_format;

  const dir = getRunDir(state.run_id);
  mkdirSync(dir, { recursive: true });
  const outputPath = `${dir}/enriched.${format}`;

  const { size_bytes } = await exportData(synthesis.merged_records, format, outputPath);

  return ExportResultSchema.parse({
    file_path: outputPath,
    format,
    record_count: synthesis.merged_records.length,
    size_bytes,
  });
}
