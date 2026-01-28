/**
 * MCP Server Types
 * Consolidated type definitions for the MCP server
 *
 * This file re-exports types from canonical sources and defines
 * interface contracts for DI services.
 */

import type { Cache, Repositories } from '@elio/db';

// Re-export database types
export type { Cache };
export type { Repositories };

// =============================================================================
// Re-export from gateway/types.ts (canonical source)
// =============================================================================

export type {
  Adapter,
  AdapterTool,
  ToolType,
  ToolPolicy,
  AuditEntry,
  ToolResult,
  GatewayContext,
  MCPToolSchema
} from '../gateway/types.js';

// Import for use in interfaces below
import type { ToolPolicy, AuditEntry, ToolResult } from '../gateway/types.js';

// =============================================================================
// Circuit Breaker Types (used by utils/circuit-breaker.ts)
// =============================================================================

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitStatus {
  state: CircuitState;
  failures: number;
  nextRetryIn: number | null;
}

export interface ICircuitBreakerRegistry {
  isOpen(service: string): boolean;
  recordSuccess(service: string): void;
  recordFailure(service: string, error?: string): void;
  getStatus(service: string): CircuitStatus;
  getAllStatus(): Record<string, CircuitStatus>;
  reset(service: string): void;
  withCircuitBreaker<T>(service: string, fn: () => Promise<T>): Promise<T>;
}

// =============================================================================
// Rate Limit Result (used by PolicyEngine)
// =============================================================================

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

// =============================================================================
// Policy Engine Interface
// =============================================================================

export interface IPolicyEngine {
  getPolicy(toolName: string, toolType: string): ToolPolicy;
  checkRateLimit(toolName: string, policy: ToolPolicy): RateLimitResult;
  requiresApproval(toolName: string, toolType: string): boolean;
}

// =============================================================================
// Audit Logger Interface
// =============================================================================

export interface AuditContext {
  startTime: number;
  complete(result: AuditEntry['result'], error?: string): AuditEntry;
}

export interface IAuditLogger {
  logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp' | 'params'> & { params: Record<string, unknown> }): AuditEntry;
  createAuditContext(tool: string, params: Record<string, unknown>): AuditContext;
}

// =============================================================================
// Tool Registry Interface
// =============================================================================

import type { Adapter as GatewayAdapter } from '../gateway/types.js';

export interface IToolRegistry {
  registerAdapter(adapter: GatewayAdapter): void;
  getRegisteredTools(): Array<{ name: string; description: string; inputSchema: unknown }>;
  executeTool(toolName: string, params: Record<string, unknown>): Promise<ToolResult>;
  isToolRegistered(toolName: string): boolean;
  getToolCount(): number;
  clearRegistry(): void;
}
