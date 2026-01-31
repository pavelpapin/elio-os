import { describe, it, expect } from 'vitest';
import { collectGate, verifyGate, reportGate, deliverGate } from '../src/orchestrator/gates.js';
import {
  DEFAULT_GIT, DEFAULT_TYPESCRIPT, DEFAULT_ESLINT, DEFAULT_ARCHITECTURE,
  DEFAULT_SECURITY, DEFAULT_INFRA, DEFAULT_MAINTENANCE,
} from '../src/types.js';
import type { StageOutput, ExecutionContext } from '../src/orchestrator/types.js';

function mockCtx(stageOutputs?: Map<string, StageOutput>): ExecutionContext {
  return {
    runId: 'test',
    basePath: '/tmp/test',
    stageOutputs: (stageOutputs ?? new Map()) as any,
    rolledBack: false,
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
  };
}

function output(stageId: string, data: unknown): StageOutput {
  return { stageId: stageId as any, data, metadata: { startedAt: '', completedAt: '', duration: 0 } };
}

function allDefaultsReviewData() {
  return {
    timestamp: new Date().toISOString(),
    git: DEFAULT_GIT,
    typescript: DEFAULT_TYPESCRIPT,
    eslint: DEFAULT_ESLINT,
    architecture: DEFAULT_ARCHITECTURE,
    security: DEFAULT_SECURITY,
    infra: DEFAULT_INFRA,
    maintenance: DEFAULT_MAINTENANCE,
  };
}

function realReviewData() {
  return {
    ...allDefaultsReviewData(),
    git: { ...DEFAULT_GIT, headSha: 'abc123', currentBranch: 'main' },
  };
}

describe('collectGate', () => {
  it('passes with real git data', () => {
    const result = collectGate(output('collect', realReviewData()), mockCtx());
    expect(result.canProceed).toBe(true);
  });

  it('fails when all collectors returned defaults', () => {
    const result = collectGate(output('collect', allDefaultsReviewData()), mockCtx());
    expect(result.canProceed).toBe(false);
    expect(result.reason).toContain('default');
  });

  it('passes when only eslint has issues', () => {
    const data = { ...allDefaultsReviewData(), eslint: { ...DEFAULT_ESLINT, warningCount: 5 } };
    expect(collectGate(output('collect', data), mockCtx()).canProceed).toBe(true);
  });
});

describe('verifyGate', () => {
  it('passes when build passed', () => {
    const fixOutput = output('fix', { results: [], headBefore: 'abc', fixesApplied: true });
    const ctx = mockCtx(new Map([['fix', fixOutput]]) as any);
    const verifyData = { buildPassed: true, testsPassed: true, buildOutput: '', testOutput: '', diffStats: { insertions: 0, deletions: 0, files: 0 } };
    expect(verifyGate(output('verify', verifyData), ctx).canProceed).toBe(true);
  });

  it('fails when build broken after fixes', () => {
    const fixOutput = output('fix', { results: [], headBefore: 'abc', fixesApplied: true });
    const ctx = mockCtx(new Map([['fix', fixOutput]]) as any);
    const verifyData = { buildPassed: false, testsPassed: false, buildOutput: 'err', testOutput: '', diffStats: { insertions: 0, deletions: 0, files: 0 } };
    const result = verifyGate(output('verify', verifyData), ctx);
    expect(result.canProceed).toBe(false);
    expect(result.reason).toContain('Build failed');
  });

  it('passes when no fixes were applied even if build fails', () => {
    const fixOutput = output('fix', { results: [], headBefore: 'abc', fixesApplied: false });
    const ctx = mockCtx(new Map([['fix', fixOutput]]) as any);
    const verifyData = { buildPassed: false, testsPassed: false, buildOutput: '', testOutput: '', diffStats: { insertions: 0, deletions: 0, files: 0 } };
    expect(verifyGate(output('verify', verifyData), ctx).canProceed).toBe(true);
  });
});

describe('reportGate', () => {
  it('passes with sufficient markdown', () => {
    const data = { markdown: 'A'.repeat(200), telegram: 'msg', score: 50, reportPath: '/tmp/r.md' };
    expect(reportGate(output('report', data), mockCtx()).canProceed).toBe(true);
  });

  it('fails with short markdown', () => {
    const data = { markdown: 'short', telegram: 'msg', score: 50, reportPath: '/tmp/r.md' };
    expect(reportGate(output('report', data), mockCtx()).canProceed).toBe(false);
  });
});

describe('deliverGate', () => {
  it('passes with reportPath', () => {
    const data = { reportPath: '/tmp/report.md', telegramSent: true };
    expect(deliverGate(output('deliver', data), mockCtx()).canProceed).toBe(true);
  });

  it('fails with empty reportPath', () => {
    const data = { reportPath: '', telegramSent: true };
    expect(deliverGate(output('deliver', data), mockCtx()).canProceed).toBe(false);
  });
});
