/**
 * System Review Orchestrator — Types
 */

import type { ReviewData, FixPlan, FixResult, VerifyResult } from '../types.js';

export type StageId = 'collect' | 'analyze' | 'fix' | 'split-files' | 'verify' | 'report' | 'deliver';

export interface GateResult {
  canProceed: boolean;
  reason?: string;
}

export interface StageOutput {
  stageId: StageId;
  data: unknown;
  metadata: { startedAt: string; completedAt: string; duration: number };
}

export type StageExecutor = (ctx: ExecutionContext) => Promise<unknown>;
export type GateFunction = (output: StageOutput, ctx: ExecutionContext) => GateResult;

export interface StageConfig {
  id: StageId;
  name: string;
  gate: GateFunction;
  timeout: number;
}

export interface ExecutionContext {
  runId: string;
  basePath: string;
  stageOutputs: Map<StageId, StageOutput>;
  rolledBack: boolean;
  logger: FileLogger;
}

export interface FileLogger {
  debug: (msg: string, data?: unknown) => void;
  info: (msg: string, data?: unknown) => void;
  warn: (msg: string, data?: unknown) => void;
  error: (msg: string, data?: unknown) => void;
}

export interface OrchestratorState {
  currentStage: StageId | null;
  completedStages: StageId[];
  failedStages: Map<StageId, string>;
  status: 'running' | 'completed' | 'failed';
  rolledBack: boolean;
}

export const STAGE_ORDER: StageId[] = [
  'collect', 'analyze', 'fix', 'split-files', 'verify', 'report', 'deliver',
];
