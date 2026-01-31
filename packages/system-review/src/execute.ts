/**
 * System Review — Library API for BullMQ worker
 *
 * Wraps the Orchestrator-based execution with a ProgressAdapter
 * so state/streaming goes through Redis instead of just Telegram.
 */

import {
  Orchestrator,
  createLogger,
  type StageConfig,
  type ExecutionHooks,
} from '@elio/shared';
import type { ExecutionContext } from './orchestrator/types.js';
import { GATES } from './orchestrator/gates.js';
import { rollback } from './verify.js';
import { selfHeal } from './self-heal.js';
import { buildGranularActions } from './fixers/granular.js';
import type { FixPlan, FixResult, ReviewData, VerifyResult } from './types.js';

import { executeCollect } from './stages/collect.js';
import { executeAnalyze } from './stages/analyze.js';
import { executeFix } from './stages/fix.js';
import { executeSplitFiles } from './stages/split-files.js';
import { executeVerify } from './stages/verify.js';
import { executeReport } from './stages/report.js';
import { executeDeliver } from './stages/deliver.js';

import { join } from 'path';
import { homedir } from 'os';
import { notify } from '@elio/shared';
import type { ProgressAdapter } from '@elio/workflow';

export type { ProgressAdapter };

export interface SystemReviewResult {
  status: 'completed' | 'failed';
  runId: string;
  rolledBack: boolean;
  error?: string;
}

const ELIO_ROOT = process.env.ELIO_ROOT || join(homedir(), '.claude');
const logger = createLogger('system-review');

function buildStages(ctx: ExecutionContext): StageConfig<ExecutionContext>[] {
  return [
    {
      id: 'collect', name: 'Collect', timeoutMs: 120_000,
      execute: (c) => executeCollect(c),
      gate: (result, c) => {
        c.stageOutputs.set('collect', { stageId: 'collect', data: result.data, metadata: { startedAt: result.startedAt, completedAt: result.completedAt, duration: result.durationMs } });
        return GATES.collect({ stageId: 'collect', data: result.data, metadata: { startedAt: result.startedAt, completedAt: result.completedAt, duration: result.durationMs } }, c);
      },
    },
    {
      id: 'analyze', name: 'Analyze', timeoutMs: 60_000,
      execute: (c) => executeAnalyze(c),
      gate: (result, c) => {
        c.stageOutputs.set('analyze', { stageId: 'analyze', data: result.data, metadata: { startedAt: result.startedAt, completedAt: result.completedAt, duration: result.durationMs } });
        return GATES.analyze({ stageId: 'analyze', data: result.data, metadata: { startedAt: result.startedAt, completedAt: result.completedAt, duration: result.durationMs } }, c);
      },
    },
    {
      id: 'fix', name: 'Fix', timeoutMs: 300_000,
      execute: (c) => executeFix(c),
      gate: (result, c) => {
        c.stageOutputs.set('fix', { stageId: 'fix', data: result.data, metadata: { startedAt: result.startedAt, completedAt: result.completedAt, duration: result.durationMs } });
        return GATES.fix({ stageId: 'fix', data: result.data, metadata: { startedAt: result.startedAt, completedAt: result.completedAt, duration: result.durationMs } }, c);
      },
    },
    {
      id: 'split-files', name: 'Split Files', timeoutMs: 10_800_000, // 3 hours
      execute: (c) => executeSplitFiles(c),
      gate: (result, c) => {
        c.stageOutputs.set('split-files', { stageId: 'split-files', data: result.data, metadata: { startedAt: result.startedAt, completedAt: result.completedAt, duration: result.durationMs } });
        return GATES['split-files']({ stageId: 'split-files', data: result.data, metadata: { startedAt: result.startedAt, completedAt: result.completedAt, duration: result.durationMs } }, c);
      },
    },
    {
      id: 'verify', name: 'Verify', timeoutMs: 180_000,
      recoverable: true,
      execute: (c) => executeVerify(c),
      gate: (result, c) => {
        c.stageOutputs.set('verify', { stageId: 'verify', data: result.data, metadata: { startedAt: result.startedAt, completedAt: result.completedAt, duration: result.durationMs } });
        return GATES.verify({ stageId: 'verify', data: result.data, metadata: { startedAt: result.startedAt, completedAt: result.completedAt, duration: result.durationMs } }, c);
      },
    },
    {
      id: 'report', name: 'Report', timeoutMs: 30_000,
      execute: (c) => executeReport(c),
      gate: (result, c) => {
        c.stageOutputs.set('report', { stageId: 'report', data: result.data, metadata: { startedAt: result.startedAt, completedAt: result.completedAt, duration: result.durationMs } });
        return GATES.report({ stageId: 'report', data: result.data, metadata: { startedAt: result.startedAt, completedAt: result.completedAt, duration: result.durationMs } }, c);
      },
    },
    {
      id: 'deliver', name: 'Deliver', timeoutMs: 60_000,
      execute: (c) => executeDeliver(c),
      gate: (result, c) => {
        c.stageOutputs.set('deliver', { stageId: 'deliver', data: result.data, metadata: { startedAt: result.startedAt, completedAt: result.completedAt, duration: result.durationMs } });
        return GATES.deliver({ stageId: 'deliver', data: result.data, metadata: { startedAt: result.startedAt, completedAt: result.completedAt, duration: result.durationMs } }, c);
      },
    },
  ];
}

/**
 * Execute system review pipeline.
 * Called by BullMQ worker — all progress goes through the adapter.
 */
export async function executeSystemReview(
  progress: ProgressAdapter,
): Promise<SystemReviewResult> {
  const runId = `system_review_${new Date().toISOString().replace(/[:.]/g, '-')}`;

  const context: ExecutionContext = {
    runId,
    basePath: ELIO_ROOT,
    stageOutputs: new Map(),
    rolledBack: false,
    logger,
  };

  await progress.start('System Review');
  await progress.setMetadata('runId', runId);

  // Build hooks that bridge to ProgressAdapter
  const hooks: ExecutionHooks = {
    onRunStart: async (_rid, stages) => {
      await progress.log(`Stages: ${stages.join(' → ')}`);
    },
    onStageStart: async (_rid, name) => {
      await progress.startStage(name);
    },
    onStageComplete: async (_rid, name, result) => {
      if (result.status === 'failed') {
        await progress.failStage(name, result.error ?? 'Unknown error');
      } else {
        await progress.completeStage(name);
      }
    },
    onRunComplete: async () => {
      // handled below
    },
    onRunFail: async (_rid, error) => {
      // handled below
    },
  };

  const orchestrator = new Orchestrator({
    runId,
    workflowName: 'system-review',
    context,
    hooks,
    onGateFailure: async (stageId, reason) => {
      if (stageId === 'verify') {
        const fixData = context.stageOutputs.get('fix')?.data as {
          headBefore: string;
          fixesApplied: boolean;
          plan?: FixPlan;
          reviewData?: ReviewData;
          results: FixResult[];
        } | undefined;

        if (!fixData?.headBefore || !fixData.plan) {
          logger.warn('Build failed but no fix data — simple rollback');
          if (fixData?.headBefore) rollback(context.basePath, fixData.headBefore);
          context.rolledBack = true;
          await progress.log('Verify: rolled back (no self-heal data)');
          return true;
        }

        // Run self-healing pipeline instead of blind rollback
        await progress.log('Verify: build failed — starting self-heal');
        await progress.startStage('Self-Heal');

        const granularActions = buildGranularActions(
          fixData.plan,
          context.basePath,
          fixData.reviewData,
        );

        const healResult = await selfHeal(
          context.basePath,
          fixData.headBefore,
          granularActions,
          logger,
        );

        // Update verify output with self-heal results
        const now = new Date().toISOString();
        const verifyData: VerifyResult = {
          buildPassed: healResult.buildPassed,
          testsPassed: healResult.testsPassed,
          buildOutput: healResult.buildOutput,
          testOutput: healResult.testOutput,
          diffStats: { insertions: 0, deletions: 0, files: 0 },
        };
        context.stageOutputs.set('verify', {
          stageId: 'verify',
          data: verifyData,
          metadata: { startedAt: now, completedAt: now, duration: 0 },
        });

        // Update fix results with what actually survived
        context.stageOutputs.set('fix', {
          stageId: 'fix',
          data: {
            results: healResult.appliedFixes,
            headBefore: fixData.headBefore,
            fixesApplied: healResult.appliedFixes.length > 0,
            plan: fixData.plan,
            reviewData: fixData.reviewData,
            selfHealResult: healResult,
          },
          metadata: { startedAt: now, completedAt: now, duration: 0 },
        });

        context.rolledBack = !healResult.buildPassed;

        const summary = [
          `Applied: ${healResult.appliedFixes.length}`,
          `Rolled back: ${healResult.rolledBackFixes.length}`,
          `Heal iterations: ${healResult.healIterations.length}`,
          `Build: ${healResult.buildPassed ? 'PASS' : 'FAIL'}`,
        ].join(' | ');

        await progress.log(`Self-heal: ${summary}`);
        await progress.completeStage('Self-Heal');
        return true;
      }
      return false;
    },
  });

  try {
    const stages = buildStages(context);
    await orchestrator.execute(stages);
    await progress.complete(`System review complete. Rolled back: ${context.rolledBack}`);
    return { status: 'completed', runId, rolledBack: context.rolledBack };
  } catch (err) {
    await progress.fail(String(err));
    return { status: 'failed', runId, rolledBack: context.rolledBack, error: String(err) };
  }
}
