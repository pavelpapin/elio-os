/**
 * Unified Execution Layer — Types
 * Common types for workflow orchestration
 */

export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface StageResult<T = unknown> {
  stageId: string;
  status: StageStatus;
  data?: T;
  error?: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface GateResult {
  canProceed: boolean;
  reason?: string;
}

export interface StageConfig<TCtx, TOut = unknown> {
  id: string;
  name: string;
  execute: (ctx: TCtx) => Promise<TOut>;
  gate?: (result: StageResult<TOut>, ctx: TCtx) => GateResult;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  /** If true, gate failure calls onGateFailure hook instead of stopping */
  recoverable?: boolean;
}

/** Called when a recoverable stage's gate fails. Return true to continue. */
export type GateFailureHandler = (stageId: string, reason: string) => Promise<boolean>;

export interface ExecutionHooks {
  onRunStart?: (runId: string, stages: string[]) => Promise<void>;
  onStageStart?: (runId: string, stageName: string) => Promise<void>;
  onStageComplete?: (runId: string, stageName: string, result: StageResult) => Promise<void>;
  onRunComplete?: (runId: string, results: Map<string, StageResult>) => Promise<void>;
  onRunFail?: (runId: string, error: string, results: Map<string, StageResult>) => Promise<void>;
}

export interface OrchestratorConfig<TCtx> {
  runId: string;
  workflowName?: string;
  context: TCtx;
  hooks?: ExecutionHooks;
  defaultTimeoutMs?: number;
  defaultRetries?: number;
  onGateFailure?: GateFailureHandler;
}

export interface OrchestratorState {
  runId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentStage: string | null;
  results: Map<string, StageResult>;
  startedAt?: string;
  completedAt?: string;
}
