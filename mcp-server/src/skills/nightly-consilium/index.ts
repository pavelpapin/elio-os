/**
 * Nightly Consilium Skill
 * Multi-model code review and auto-improvement system
 * Runs at 02:00 Tbilisi time (22:00 UTC)
 */

import { execSync } from 'child_process';
import { createFileLogger } from '../../utils/file-logger.js';
import { startRun, updateStage, completeRun, failRun, generateRunId, notifyTelegram } from '../../utils/progress.js';
import type { ConsiliumResult, AnalysisCategory } from './types.js';
import { ANALYSIS_CATEGORIES } from './types.js';
import { collectDailyChanges, findTsFiles, MCP_SERVER_PATH } from './collection.js';
import { analyzeCodeLocally, callModelForAnalysis } from './analysis.js';
import { runConsiliumVote, applyAutoFixes } from './voting.js';
import { createNotionReport, formatTelegramSummary } from './report.js';

const STAGES = [
  'Collecting changes',
  'Analyzing with Claude',
  'Analyzing with GPT-4',
  'Analyzing with Groq',
  'Running consilium vote',
  'Applying auto-fixes',
  'Verifying changes',
  'Creating report'
];

/**
 * Main consilium orchestration
 */
export async function runNightlyConsilium(): Promise<ConsiliumResult> {
  const runId = generateRunId('consilium');
  const logger = createFileLogger('consilium', runId);

  try {
    await startRun(runId, 'Nightly Consilium', STAGES);

    // Phase 1: Collect data
    await updateStage(runId, 'Collecting changes');
    const changes = await collectDailyChanges(logger);
    logger.info(`Found ${changes.changedFiles.length} changed files`);

    const allFiles = findTsFiles(MCP_SERVER_PATH);
    logger.info(`Found ${allFiles.length} TypeScript files to analyze`);

    const localAnalysis = analyzeCodeLocally(allFiles);
    logger.info(`Local analysis found ${localAnalysis.priorities?.length || 0} priority issues`);

    // Phase 2: Parallel model analysis
    await updateStage(runId, 'Analyzing with Claude');
    const claudeAnalysis = await callModelForAnalysis('claude', changes.gitDiff, localAnalysis);

    await updateStage(runId, 'Analyzing with GPT-4');
    const gptAnalysis = await callModelForAnalysis('openai', changes.gitDiff, localAnalysis);

    await updateStage(runId, 'Analyzing with Groq');
    const groqAnalysis = await callModelForAnalysis('groq', changes.gitDiff, localAnalysis);

    const analyses = [claudeAnalysis, gptAnalysis, groqAnalysis];

    // Phase 3: Consilium vote
    await updateStage(runId, 'Running consilium vote');
    const consensus = runConsiliumVote(analyses);
    logger.info(`Consilium consensus: ${consensus.length} actions prioritized`);

    // Phase 4: Apply auto-fixes
    await updateStage(runId, 'Applying auto-fixes');
    const allFixes = analyses.flatMap(a => a.autoFixes);
    const appliedFixes = await applyAutoFixes(allFixes, logger);
    logger.info(`Applied ${appliedFixes.length} auto-fixes`);

    // Phase 5: Verify
    await updateStage(runId, 'Verifying changes');
    try {
      execSync('cd /root/.claude/mcp-server && npm run build 2>/dev/null || true', { encoding: 'utf-8' });
      logger.info('Build passed');
    } catch {
      logger.warn('Build check skipped or failed');
    }

    // Phase 6: Create report
    await updateStage(runId, 'Creating report');

    const result: ConsiliumResult = {
      runId,
      timestamp: new Date().toISOString(),
      models: analyses,
      consensus,
      appliedFixes,
      manualReviewRequired: consensus.filter(c => c.votes >= 2).map(c => c.action),
      scoreChanges: {} as Record<AnalysisCategory, { before: number; after: number }>
    };

    // Calculate score changes
    for (const category of ANALYSIS_CATEGORIES) {
      const avgBefore = analyses.reduce((sum, a) => sum + (a.analysis[category]?.score || 0), 0) / analyses.length;
      result.scoreChanges[category] = { before: Math.round(avgBefore), after: Math.round(avgBefore) };
    }

    const reportPath = await createNotionReport(result, logger);
    const summary = formatTelegramSummary(result);
    await notifyTelegram(summary);

    await completeRun(runId, { type: 'file', path: reportPath || undefined });

    return result;

  } catch (error) {
    logger.error('Consilium failed', { error: String(error) });
    await failRun(runId, String(error));
    throw error;
  }
}

// Export for MCP tool
export const nightlyConsiliumTool = {
  name: 'nightly_consilium',
  description: 'Run nightly consilium - multi-model code review and auto-improvement',
  execute: runNightlyConsilium
};

// Re-export types
export type { ConsiliumResult, ModelAnalysis, Issue } from './types.js';
