/**
 * Stage 6: Report — generate markdown, create Notion page
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { callLLM, loadPrompt } from '../llm.js';
import { ReportResultSchema } from '../types.js';
import { getRunDir } from '../state.js';
import type { PipelineState } from '../types.js';

const CLI_USER = 'elio';

export async function execute(state: PipelineState): Promise<unknown> {
  const prompt = loadPrompt('report_editor.md');
  const brief = state.stage_outputs.discovery!;
  const collection = state.stage_outputs.collection!;
  const validation = state.stage_outputs.validation!;
  const synthesis = state.stage_outputs.synthesis!;
  const exportResult = state.stage_outputs.export!;

  const reportInput = {
    input_file: brief.input_file,
    record_count: brief.record_count,
    enrichment_goals: brief.enrichment_goals,
    total_processed: collection.total_processed,
    total_errors: collection.total_errors,
    total_api_calls: collection.total_api_calls,
    average_quality: validation.average_quality_score,
    conflicts_count: validation.conflicts.length,
    insights: synthesis.insights,
    enrichment_coverage: synthesis.enrichment_coverage,
    data_quality_summary: synthesis.data_quality_summary,
    output_file: exportResult.file_path,
    output_format: exportResult.format,
    output_records: exportResult.record_count,
  };

  const reportContent = await callLLM({
    provider: 'claude',
    prompt: `${prompt}\n\nGenerate a FULL markdown report. Return JSON: { "markdown": "..." }`,
    input: JSON.stringify(reportInput),
  }) as { markdown: string };

  // Save report locally
  const dir = getRunDir(state.run_id);
  const reportPath = `${dir}/report.md`;
  writeFileSync(reportPath, reportContent.markdown);

  // Create Notion page
  const date = new Date().toISOString().split('T')[0];
  const title = `Data Enrichment: ${brief.input_file.split('/').pop()} — ${date}`;
  const notionPrompt = `Create a Notion page using elio_notion_create_page tool.
Title: '${title}'
Content (markdown): Read from file ${reportPath}
Return the page URL and ID.`;

  let notionUrl = '';
  let pageId = '';
  try {
    const tmpDir = mkdtempSync(join(tmpdir(), 'elio-notion-'));
    const promptFile = join(tmpDir, 'prompt.txt');
    writeFileSync(promptFile, notionPrompt, 'utf-8');
    const notionResult = execSync(
      `sudo -u ${CLI_USER} claude --print --dangerously-skip-permissions < ${escapeShell(promptFile)}`,
      { encoding: 'utf-8', timeout: 120_000, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    try { execSync(`rm -rf ${escapeShell(tmpDir)}`); } catch { /* cleanup */ }
    const urlMatch = notionResult.match(/https:\/\/(?:www\.)?notion\.so\/\S+/);
    notionUrl = urlMatch?.[0] ?? '';
    const idMatch = notionResult.match(/[a-f0-9]{32}|[a-f0-9-]{36}/);
    pageId = idMatch?.[0] ?? '';
  } catch {
    notionUrl = `file://${reportPath}`;
    pageId = 'local';
  }

  return ReportResultSchema.parse({
    notion_url: notionUrl || `file://${reportPath}`,
    page_id: pageId || 'local',
    block_count: Math.ceil(reportContent.markdown.split('\n').length / 2),
  });
}

function escapeShell(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
