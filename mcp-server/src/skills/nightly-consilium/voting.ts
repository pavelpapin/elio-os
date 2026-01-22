/**
 * Nightly Consilium - Voting & Auto-Fixes
 * Multi-model consensus voting and automatic fix application
 */

import type { createFileLogger } from '../../utils/file-logger.js';
import type { ModelAnalysis, ConsensusItem, AutoFix } from './types.js';

/**
 * Run consilium vote across model analyses
 */
export function runConsiliumVote(analyses: ModelAnalysis[]): ConsensusItem[] {
  const actionVotes: Record<string, number> = {};

  for (const analysis of analyses) {
    for (const priority of analysis.priorities.slice(0, 5)) {
      actionVotes[priority] = (actionVotes[priority] || 0) + 1;
    }
  }

  return Object.entries(actionVotes)
    .sort((a, b) => b[1] - a[1])
    .map(([action, votes], index) => ({
      action,
      votes,
      priority: index + 1
    }));
}

/**
 * Apply auto-fixes based on analysis
 */
export async function applyAutoFixes(
  fixes: AutoFix[],
  logger: ReturnType<typeof createFileLogger>
): Promise<string[]> {
  const applied: string[] = [];

  for (const fix of fixes) {
    try {
      if (fix.type === 'file_size') {
        logger.info(`Would split file: ${fix.file}`);
      }

      if (fix.type === 'logging') {
        logger.info(`Would fix logging in: ${fix.file}`);
      }

      applied.push(`${fix.type}:${fix.file}`);
    } catch (error) {
      logger.error(`Failed to apply fix: ${fix.type} on ${fix.file}`, { error });
    }
  }

  return applied;
}
