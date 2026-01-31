import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SystemReviewOrchestrator } from '../src/orchestrator/index.js';
import type { StageExecutors, ProgressHooks } from '../src/orchestrator/index.js';
import type { ExecutionContext } from '../src/orchestrator/types.js';
import {
  DEFAULT_GIT, DEFAULT_TYPESCRIPT, DEFAULT_ESLINT, DEFAULT_ARCHITECTURE,
  DEFAULT_SECURITY, DEFAULT_INFRA, DEFAULT_MAINTENANCE,
} from '../src/types.js';

const logger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

const noopHooks: ProgressHooks = {
  onRunStart: async () => {},
  onStageStart: async () => {},
  onStageComplete: async () => {},
  onRunComplete: async () => {},
  onRunFail: async () => {},
};

function makeCtx(): ExecutionContext {
  return {
    runId: 'test-run',
    basePath: '/tmp/test',
    stageOutputs: new Map(),
    rolledBack: false,
    logger,
  };
}

const realReviewData = {
  timestamp: new Date().toISOString(),
  git: { ...DEFAULT_GIT, headSha: 'abc123', currentBranch: 'main' },
  typescript: { success: true, diagnostics: [], errorCount: 0 },
  eslint: { errorCount: 0, warningCount: 2, fixableCount: 1, issues: [] },
  architecture: DEFAULT_ARCHITECTURE,
  security: DEFAULT_SECURITY,
  infra: DEFAULT_INFRA,
  maintenance: DEFAULT_MAINTENANCE,
};

const validPlan = {
  actions: [],
  healthAssessment: 'System is healthy',
  score: 95,
};

const validFixOutput = { results: [], headBefore: 'abc123', fixesApplied: false };
const validVerifyOutput = { buildPassed: true, testsPassed: true, buildOutput: '', testOutput: '', diffStats: { insertions: 0, deletions: 0, files: 0 } };
const validReportOutput = { markdown: 'A'.repeat(200), telegram: 'Summary msg', score: 95, reportPath: '/tmp/test/report.md' };
const validDeliverOutput = { reportPath: '/tmp/test/report.md', telegramSent: true };

function makeExecutors(overrides?: Partial<StageExecutors>): StageExecutors {
  return {
    collect: async () => realReviewData,
    analyze: async () => validPlan,
    fix: async () => validFixOutput,
    verify: async () => validVerifyOutput,
    report: async () => validReportOutput,
    deliver: async () => validDeliverOutput,
    ...overrides,
  };
}

describe('SystemReviewOrchestrator', () => {
  it('executes all 6 stages successfully', async () => {
    const ctx = makeCtx();
    const orch = new SystemReviewOrchestrator(makeExecutors(), noopHooks, ctx);
    await orch.execute();

    const state = orch.getState();
    expect(state.status).toBe('completed');
    expect(state.completedStages).toEqual(['collect', 'analyze', 'fix', 'verify', 'report', 'deliver']);
    expect(state.rolledBack).toBe(false);
  });

  it('calls hooks in order', async () => {
    const calls: string[] = [];
    const hooks: ProgressHooks = {
      onRunStart: async () => { calls.push('start'); },
      onStageStart: async (_, name) => { calls.push(`stage:${name}`); },
      onStageComplete: async (_, name, status) => { calls.push(`done:${name}:${status}`); },
      onRunComplete: async () => { calls.push('complete'); },
      onRunFail: async () => { calls.push('fail'); },
    };

    await new SystemReviewOrchestrator(makeExecutors(), hooks, makeCtx()).execute();
    expect(calls[0]).toBe('start');
    expect(calls[calls.length - 1]).toBe('complete');
    expect(calls).toContain('stage:Collect');
    expect(calls).toContain('done:Deliver:completed');
  });

  it('blocks when all collectors return defaults', async () => {
    const executors = makeExecutors({
      collect: async () => ({
        timestamp: new Date().toISOString(),
        git: DEFAULT_GIT,
        typescript: DEFAULT_TYPESCRIPT,
        eslint: DEFAULT_ESLINT,
        architecture: DEFAULT_ARCHITECTURE,
        security: DEFAULT_SECURITY,
        infra: DEFAULT_INFRA,
        maintenance: DEFAULT_MAINTENANCE,
      }),
    });

    const orch = new SystemReviewOrchestrator(executors, noopHooks, makeCtx());
    await expect(orch.execute()).rejects.toThrow('Gate failed');
    expect(orch.getState().status).toBe('failed');
  });

  it('rolls back on verify failure and continues to report+deliver', async () => {
    const rollbackFn = vi.fn();
    const executors = makeExecutors({
      fix: async () => ({ results: [{ actionId: '1', description: 'fix', success: true, output: 'ok' }], headBefore: 'abc123', fixesApplied: true }),
      verify: async () => ({ ...validVerifyOutput, buildPassed: false }),
    });

    const ctx = makeCtx();
    const orch = new SystemReviewOrchestrator(executors, noopHooks, ctx, rollbackFn);
    await orch.execute();

    const state = orch.getState();
    expect(state.status).toBe('completed');
    expect(state.rolledBack).toBe(true);
    expect(rollbackFn).toHaveBeenCalledWith('/tmp/test', 'abc123');
    // report and deliver still ran
    expect(state.completedStages).toContain('report');
    expect(state.completedStages).toContain('deliver');
  });

  it('does NOT rollback when no fixes were applied', async () => {
    const rollbackFn = vi.fn();
    const executors = makeExecutors({
      verify: async () => ({ ...validVerifyOutput, buildPassed: false }),
    });

    const ctx = makeCtx();
    const orch = new SystemReviewOrchestrator(executors, noopHooks, ctx, rollbackFn);
    await orch.execute();

    // fixesApplied=false so verify gate passes, no rollback
    expect(rollbackFn).not.toHaveBeenCalled();
    expect(orch.getState().rolledBack).toBe(false);
  });

  it('stores stage outputs in context', async () => {
    const ctx = makeCtx();
    await new SystemReviewOrchestrator(makeExecutors(), noopHooks, ctx).execute();
    expect(ctx.stageOutputs.has('collect')).toBe(true);
    expect(ctx.stageOutputs.has('deliver')).toBe(true);
  });

  it('fails on stage execution error', async () => {
    const executors = makeExecutors({
      collect: async () => { throw new Error('disk full'); },
    });

    const orch = new SystemReviewOrchestrator(executors, noopHooks, makeCtx());
    await expect(orch.execute()).rejects.toThrow('disk full');
    expect(orch.getState().status).toBe('failed');
  });
});
