/**
 * Stage: Report — generate markdown + telegram summary
 */

import { writeFileSync, mkdirSync } from 'fs';
import type { ExecutionContext } from '../orchestrator/types.js';
import type { ReviewData, FixPlan, VerifyResult, FixResult } from '../types.js';
import { generateMarkdownReport, generateTelegramSummary } from '../report.js';

export async function executeReport(ctx: ExecutionContext): Promise<unknown> {
  const data = ctx.stageOutputs.get('collect')?.data as ReviewData;
  const plan = ctx.stageOutputs.get('analyze')?.data as FixPlan;
  const fixData = ctx.stageOutputs.get('fix')?.data as {
    results: FixResult[];
    headBefore: string;
    selfHealResult?: import('../self-heal.js').SelfHealResult;
  };
  const verification = (ctx.stageOutputs.get('verify')?.data ?? {
    buildPassed: false, testsPassed: false,
    buildOutput: 'N/A', testOutput: 'N/A',
    diffStats: { insertions: 0, deletions: 0, files: 0 },
  }) as VerifyResult;

  // Include split-files results in fix results for the report
  const splitData = ctx.stageOutputs.get('split-files')?.data as {
    results: FixResult[];
  } | undefined;
  const allFixResults = [
    ...fixData.results,
    ...(splitData?.results ?? []),
  ];

  const input = {
    data,
    plan,
    fixResults: allFixResults,
    verification,
    rolledBack: ctx.rolledBack,
    commitOutput: '',
    selfHealResult: fixData.selfHealResult,
  };

  ctx.logger.info('Generating report');
  const markdown = generateMarkdownReport(input);
  const telegram = generateTelegramSummary(input);

  const logDir = `${ctx.basePath}/logs/reviews/system`;
  mkdirSync(logDir, { recursive: true });
  const date = new Date().toISOString().split('T')[0];
  const reportPath = `${logDir}/${date}.md`;
  writeFileSync(reportPath, markdown);

  ctx.logger.info('Report saved', { path: reportPath, score: plan.score });
  return { markdown, telegram, score: plan.score, reportPath };
}
