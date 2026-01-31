/**
 * Unified Orchestrator
 * Generic stage-based workflow execution with timeouts, retries, and gates
 */

import { createLogger } from '../logger.js';
import { notify } from '../notify.js';
import { workflowMetrics } from '../observability/metrics.js';
import type {
  StageConfig,
  StageResult,
  ExecutionHooks,
  OrchestratorConfig,
  OrchestratorState,
  GateResult,
  GateFailureHandler,
} from './types.js';

const logger = createLogger('orchestrator');

export class Orchestrator<TCtx> {
  private state: OrchestratorState;
  private context: TCtx;
  private hooks: ExecutionHooks;
  private defaultTimeoutMs: number;
  private defaultRetries: number;
  private workflowName: string;
  private onGateFailure?: GateFailureHandler;

  constructor(config: OrchestratorConfig<TCtx>) {
    this.state = {
      runId: config.runId,
      status: 'idle',
      currentStage: null,
      results: new Map(),
    };
    this.context = config.context;
    this.hooks = config.hooks ?? {};
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? 120_000;
    this.defaultRetries = config.defaultRetries ?? 0;
    this.workflowName = config.workflowName ?? 'unknown';
    this.onGateFailure = config.onGateFailure;
  }

  getState(): Readonly<OrchestratorState> {
    return this.state;
  }

  getResult<T>(stageId: string): StageResult<T> | undefined {
    return this.state.results.get(stageId) as StageResult<T> | undefined;
  }

  async execute<TOut>(stages: StageConfig<TCtx, TOut>[]): Promise<Map<string, StageResult>> {
    const { runId } = this.state;
    const stageNames = stages.map((s) => s.name);
    const runStartTime = Date.now();

    this.state.status = 'running';
    this.state.startedAt = new Date().toISOString();
    logger.info(`Run started: ${runId}`, { stages: stageNames });

    // Track metrics
    workflowMetrics.runsTotal.inc({ workflow: this.workflowName });
    workflowMetrics.runsActive.inc({ workflow: this.workflowName });

    await this.hooks.onRunStart?.(runId, stageNames);

    try {
      for (const stage of stages) {
        const result = await this.executeStage(stage);

        // Check gate if defined
        if (stage.gate) {
          const gateResult = stage.gate(result, this.context);
          if (!gateResult.canProceed) {
            const reason = gateResult.reason ?? 'Gate check failed';
            // Recoverable stages delegate to onGateFailure handler
            if (stage.recoverable && this.onGateFailure) {
              const shouldContinue = await this.onGateFailure(stage.id, reason);
              if (shouldContinue) {
                logger.warn(`Gate failed for ${stage.name} but recovered`, { reason });
                continue;
              }
            }
            throw new GateError(stage.name, reason);
          }
        }

        // Stop on failure (unless gate explicitly allows)
        if (result.status === 'failed') {
          throw new Error(`Stage ${stage.name} failed: ${result.error}`);
        }
      }

      this.state.status = 'completed';
      this.state.completedAt = new Date().toISOString();

      // Track duration
      workflowMetrics.runDuration.observe(Date.now() - runStartTime, { workflow: this.workflowName, status: 'completed' });

      logger.info(`Run completed: ${runId}`);
      await this.hooks.onRunComplete?.(runId, this.state.results);
    } catch (error) {
      this.state.status = 'failed';
      this.state.completedAt = new Date().toISOString();

      // Track failure
      workflowMetrics.runDuration.observe(Date.now() - runStartTime, { workflow: this.workflowName, status: 'failed' });

      const errorMsg = String(error);
      logger.error(`Run failed: ${runId}`, { error: errorMsg });
      await this.hooks.onRunFail?.(runId, errorMsg, this.state.results);
      throw error;
    } finally {
      workflowMetrics.runsActive.dec({ workflow: this.workflowName });
    }

    return this.state.results;
  }

  private async executeStage<TOut>(stage: StageConfig<TCtx, TOut>): Promise<StageResult<TOut>> {
    const { runId } = this.state;
    const timeoutMs = stage.timeoutMs ?? this.defaultTimeoutMs;
    const maxRetries = stage.retries ?? this.defaultRetries;
    const retryDelayMs = stage.retryDelayMs ?? 1000;

    this.state.currentStage = stage.id;
    logger.info(`Stage start: ${stage.name}`);
    await this.hooks.onStageStart?.(runId, stage.name);

    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const data = await this.withTimeout(stage.execute(this.context), timeoutMs, stage.name);

        const result: StageResult<TOut> = {
          stageId: stage.id,
          status: 'completed',
          data,
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        };

        // Track stage metrics
        workflowMetrics.stagesDuration.observe(result.durationMs, {
          workflow: this.workflowName,
          stage: stage.id,
          status: 'completed',
        });

        this.state.results.set(stage.id, result);
        logger.info(`Stage done: ${stage.name}`, { durationMs: result.durationMs });
        await this.hooks.onStageComplete?.(runId, stage.name, result);
        return result;
      } catch (error) {
        lastError = String(error);
        if (attempt < maxRetries) {
          logger.warn(`Stage retry: ${stage.name}`, { attempt: attempt + 1, error: lastError });
          await this.delay(retryDelayMs * (attempt + 1)); // Exponential backoff
        }
      }
    }

    // All retries exhausted
    const result: StageResult<TOut> = {
      stageId: stage.id,
      status: 'failed',
      error: lastError,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };

    // Track stage failure metrics
    workflowMetrics.stagesDuration.observe(result.durationMs, {
      workflow: this.workflowName,
      stage: stage.id,
      status: 'failed',
    });
    workflowMetrics.stagesErrors.inc({
      workflow: this.workflowName,
      stage: stage.id,
    });

    this.state.results.set(stage.id, result);
    logger.error(`Stage failed: ${stage.name}`, { error: lastError });
    await this.hooks.onStageComplete?.(runId, stage.name, result);
    return result;
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      );
      promise.then(
        (v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); },
      );
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class GateError extends Error {
  constructor(public readonly stageName: string, public readonly reason: string) {
    super(`Gate failed [${stageName}]: ${reason}`);
    this.name = 'GateError';
  }
}

/**
 * Default hooks that send Telegram notifications
 */
export function createNotifyHooks(prefix?: string): ExecutionHooks {
  const p = prefix ? `[${prefix}] ` : '';
  return {
    onRunStart: async (runId, stages) => {
      await notify(`🚀 <b>${p}Started</b>\nStages: ${stages.join(' → ')}`);
    },
    onStageStart: async (_runId, name) => {
      await notify(`⚙️ ${p}${name}...`);
    },
    onStageComplete: async (_runId, name, result) => {
      if (result.status === 'failed') {
        await notify(`❌ ${p}${name} failed: ${result.error}`);
      }
    },
    onRunComplete: async (_runId) => {
      await notify(`✅ <b>${p}Complete</b>`);
    },
    onRunFail: async (_runId, error) => {
      await notify(`❌ <b>${p}Failed</b>\n${error}`);
    },
  };
}
