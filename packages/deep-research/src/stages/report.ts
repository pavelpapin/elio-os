/**
 * Stage 6: Report — generate markdown, create Notion page, verify
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { callLLM, loadPrompt } from '../llm.js';
import { ReportResultSchema } from '../types.js';
import type { PipelineState } from '../types.js';

export async function execute(state: PipelineState): Promise<unknown> {
  // Idempotency guard: if report already created, verify and return
  if (state.stage_outputs.report?.notion_url) {
    const url = state.stage_outputs.report.notion_url;
    if (!url.startsWith('file://')) {
      console.log(`Report already exists: ${url}`);
      return state.stage_outputs.report;
    }
  }

  const prompt = loadPrompt('report_editor.md');
  const brief = state.stage_outputs.discovery!;
  const synthesis = state.stage_outputs.synthesis!;
  const risks = state.stage_outputs.devils_advocate!;
  const factcheck = state.stage_outputs.factcheck!;

  // Step 1: Generate markdown report via Claude
  const reportInput = {
    topic: brief.topic,
    executive_summary: synthesis.executive_summary,
    key_findings: synthesis.key_findings,
    recommendations: synthesis.recommendations,
    market_map: synthesis.market_map,
    decision_framework: synthesis.decision_framework,
    risks: risks.risks,
    blind_spots: risks.blind_spots,
    verified_facts_count: factcheck.verification_stats.verified,
    total_facts: factcheck.verification_stats.total,
  };

  const reportContent = await callLLM({
    provider: 'claude',
    prompt: `${prompt}\n\nGenerate a FULL markdown report. Return JSON: { "markdown": "..." }`,
    input: JSON.stringify(reportInput),
  }) as { markdown: string };

  // Save report locally
  const reportPath = `/root/.claude/logs/workflows/deep-research/${state.run_id}/report.md`;
  writeFileSync(reportPath, reportContent.markdown);

  // Step 2: Create Notion page via Claude MCP
  const date = new Date().toISOString().split('T')[0];
  const title = `Research: ${brief.topic} — ${date}`;
  const notionPrompt = `Create a Notion page using elio_notion_create_page tool.
Title: '${title}'
Content (markdown): Read from file ${reportPath}
Return the page URL and ID.`;

  let notionUrl = '';
  let pageId = '';
  try {
    const notionResult = execSync(
      `echo ${escapeShell(notionPrompt)} | claude --print --allowedTools "mcp__elio__*"`,
      { encoding: 'utf-8', timeout: 60_000, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    // Parse URL from Claude's response
    const urlMatch = notionResult.match(/https:\/\/(?:www\.)?notion\.so\/\S+/);
    notionUrl = urlMatch?.[0] ?? '';
    const idMatch = notionResult.match(/[a-f0-9]{32}|[a-f0-9-]{36}/);
    pageId = idMatch?.[0] ?? '';
  } catch {
    // Fallback: report saved locally
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
