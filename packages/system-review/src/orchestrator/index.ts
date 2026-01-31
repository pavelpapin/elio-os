/**
 * System Review Orchestrator
 * State machine: Collect → Analyze → Fix → Verify → Report → Deliver
 */

import type {
  StageConfig,
  StageId,
  StageOutput,
  ExecutionContext,
  OrchestratorState,
  StageExecutor,
  GateFunction,
} from './types.js';
import { GATES } from './gates.js';

export interface StageExecutors {
  collect: StageExecutor;
  analyze: StageExecutor;
  fix: StageExecutor;
  verify: StageExecutor;
  report: StageExecutor;
  deliver: StageExecutor;
}

export interface ProgressHooks {
  onRunStart: (runId: string, stages: string[]) => Promise<void>;
  onStageStart: (runId: string, name: string) => Promise<void>;
  onStageComplete: (runId: string, name: string, status: string, detail?: string) => Promise<void>;
  onRunComplete: (runId: string) => Promise<void>;
  onRunFail: (runId: string, error: string) => Promise<void>;
}

const STAGE_CONFIGS: { id: StageId; name: string; gate: GateFunction; timeout: number }[] = [
  { id: 'collect', name: 'Collect', gate: GATES.collect, timeout: 120_000 },
  { id: 'analyze', name: 'Analyze', gate: GATES.analyze, timeout: 60_000 },
  { id: 'fix', name: 'Fix', gate: GATES.fix, timeout: 300_000 },
  { id: 'verify', name: 'Verify', gate: GATES.verify, timeout: 180_000 },
  { id: 'report', name: 'Report', gate: GATES.report, timeout: 30_000 },
  { id: 'deliver', name: 'Deliver', gate: GATES.deliver, timeout: 60_000 },
];

export class SystemReviewOrchestrator {
  private state: OrchestratorState;
  private context: ExecutionContext;
  private rollbackFn?: (basePath: string, headSha: string) => void;

  constructor(
    private executors: StageExecutors,
    private hooks: ProgressHooks,
    context: ExecutionContext,
    rollbackFn?: (basePath: string, headSha: string) => void,
  ) {
    this.context = context;
    this.rollbackFn = rollbackFn;
    this.state = {
      currentStage: null,
      completedStages: [],
      failedStages: new Map(),
      status: 'running',
      rolledBack: false,
    };
  }

  getState(): Readonly<OrchestratorState> {
    return this.state;
  }

  async execute(): Promise<void> {
    const { runId, logger } = this.context;
    const stageNames = STAGE_CONFIGS.map((s) => s.name);
    await this.hooks.onRunStart(runId, stageNames);

    try {
      for (const conf of STAGE_CONFIGS) {
        await this.runStage(conf);

        // Verify special case: gate fail → rollback → continue
        if (conf.id === 'verify' && this.state.failedStages.has('verify')) {
          await this.handleVerifyFailure();
        }
      }

      this.state.status = 'completed';
      await this.hooks.onRunComplete(runId);
    } catch (error) {
      this.state.status = 'failed';
      logger.error('Orchestrator failed', { error: String(error) });
      await this.hooks.onRunFail(runId, String(error));
      throw error;
    }
  }

  private async handleVerifyFailure(): Promise<void> {
    const { logger, basePath } = this.context;
    const fixData = this.context.stageOutputs.get('fix')?.data as { headBefore: string } | undefined;

    if (fixData?.headBefore && this.rollbackFn) {
      logger.warn('Build failed after fixes — rolling back');
      this.rollbackFn(basePath, fixData.headBefore);
    }

    this.state.rolledBack = true;
    this.context.rolledBack = true;

    // Clear failure so pipeline continues to report + deliver
    this.state.failedStages.delete('verify');
    this.state.completedStages.push('verify');
    await this.hooks.onStageComplete(this.context.runId, 'Verify', 'rolled-back');
  }

  private async runStage(conf: { id: StageId; name: string; gate: GateFunction; timeout: number }): Promise<void> {
    const { id, name, gate, timeout } = conf;
    const { runId, logger } = this.context;
    const executor = this.executors[id];

    this.state.currentStage = id;
    logger.info(`Stage start: ${name}`);
    await this.hooks.onStageStart(runId, name);

    const startTime = Date.now();

    try {
      const rawData = await this.withTimeout(executor(this.context), timeout, name);

      const output: StageOutput = {
        stageId: id,
        data: rawData,
        metadata: {
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          duration: Date.now() - startTime,
        },
      };

      // Save output before gate check — downstream stages may need it
      // even if the gate fails (e.g. verify data needed by report after rollback)
      this.context.stageOutputs.set(id, output);

      const gateResult = gate(output, this.context);
      if (!gateResult.canProceed) {
        throw new GateError(name, gateResult.reason ?? 'Gate failed');
      }
      this.state.completedStages.push(id);
      logger.info(`Stage done: ${name} (${output.metadata.duration}ms)`);
      await this.hooks.onStageComplete(runId, name, 'completed');
    } catch (error) {
      const msg = String(error);
      this.state.failedStages.set(id, msg);
      logger.error(`Stage failed: ${name}`, { error: msg });
      await this.hooks.onStageComplete(runId, name, 'failed', msg);

      // Verify failures handled by caller
      if (id === 'verify') return;
      throw error;
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      promise.then(
        (v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); },
      );
    });
  }
}

export class GateError extends Error {
  constructor(public readonly stageName: string, public readonly gateReason: string) {
    super(`Gate failed [${stageName}]: ${gateReason}`);
    this.name = 'GateError';
  }
}
