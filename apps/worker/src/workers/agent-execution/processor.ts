/**
 * Agent job processing logic
 *
 * DEPRECATED: This file was a duplicate of agentExecution.ts.
 * All logic now lives in ../agentExecution.ts via shared agent-helpers.
 * This re-export exists only for backward compatibility.
 */

// Re-export the canonical processAgentJob if any external code imports from here
export type { AgentExecutionParams, AgentExecutionResult } from './config.js'
