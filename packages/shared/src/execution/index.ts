/**
 * Unified Execution Layer
 * Shared orchestrator for all workflows
 */

export { Orchestrator, GateError, createNotifyHooks } from './orchestrator.js';
export type {
  StageStatus,
  StageResult,
  GateResult,
  StageConfig,
  ExecutionHooks,
  OrchestratorConfig,
  OrchestratorState,
  GateFailureHandler,
} from './types.js';
