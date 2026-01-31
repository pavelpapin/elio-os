/**
 * Stage 7: Verification — file + Notion + data integrity checks
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { VerificationResultSchema } from '../types.js';
import type { PipelineState } from '../types.js';

export async function execute(state: PipelineState): Promise<unknown> {
  const exportResult = state.stage_outputs.export!;
  const reportResult = state.stage_outputs.report!;
  const synthesis = state.stage_outputs.synthesis!;

  // File integrity check
  const fileExists = existsSync(exportResult.file_path);
  let fileSize = 0;
  let recordCountMatches = false;

  if (fileExists) {
    fileSize = statSync(exportResult.file_path).size;
    const content = readFileSync(exportResult.file_path, 'utf-8');

    if (exportResult.format === 'json') {
      const records = JSON.parse(content) as unknown[];
      recordCountMatches = records.length === exportResult.record_count;
    } else {
      // CSV: count non-empty lines minus header
      const lines = content.split('\n').filter((l) => l.trim().length > 0);
      recordCountMatches = (lines.length - 1) === exportResult.record_count;
    }
  }

  // Notion check
  const notionExists = reportResult.notion_url.length > 0;
  const notionBlockCount = reportResult.block_count;

  // Data completeness
  const enrichmentCoverage = synthesis.enrichment_coverage;
  const mergedCount = synthesis.merged_records.length;
  const allRequiredFields = mergedCount > 0;
  const noCorruption = fileExists && fileSize > 0;

  const allPassed = fileExists && recordCountMatches && notionExists && allRequiredFields && noCorruption;

  return VerificationResultSchema.parse({
    file_check: {
      exists: fileExists,
      record_count_matches: recordCountMatches,
      size_bytes: fileSize,
    },
    notion_check: {
      exists: notionExists,
      block_count: notionBlockCount,
    },
    data_check: {
      enrichment_coverage: enrichmentCoverage,
      all_required_fields: allRequiredFields,
      no_corruption: noCorruption,
    },
    all_passed: allPassed,
  });
}
