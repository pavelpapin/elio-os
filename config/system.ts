/**
 * Unified System Configuration
 * Consolidates: config/schedules.json, scripts/system-loop/config.ts
 */

import { ELIO_ROOT } from '@elio/shared';
import type { ReviewConfig, Collector, TeamMember, ScheduledScript } from './types.js';

// Re-export types
export * from './types.js';

// Re-export reviews, collectors, schedules
export { collectors, reviews, scheduledScripts, standup, weeklySummary } from './reviews.js';

// Import for use in helper functions
import { reviews, collectors, scheduledScripts } from './reviews.js';

// ============================================================================
// System Paths
// ============================================================================

export const paths = {
  root: ELIO_ROOT,
  team: `${ELIO_ROOT}/team`,
  config: `${ELIO_ROOT}/config`,
  logs: `${ELIO_ROOT}/logs`,
  state: `${ELIO_ROOT}/state`,
  skills: `${ELIO_ROOT}/skills`,
  agents: `${ELIO_ROOT}/agents`,
  scripts: `${ELIO_ROOT}/scripts`,
  secrets: `${ELIO_ROOT}/secrets`,
} as const;

// ============================================================================
// System Settings
// ============================================================================

export const system = {
  name: 'Elio OS',
  timezone: 'Asia/Tbilisi',
  catchUpWindowHours: 2,
  agentTimeoutMinutes: 30,
  logDir: `${paths.logs}/system-loop`,
  stateFile: `${paths.state}/system-loop-state.json`,
  retryOnFailure: 3,
  notifyOnFailure: true,
} as const;

// ============================================================================
// Stage Types (workflow execution phases)
// ============================================================================

export const stageTypes: Record<import('./types.js').StageType, import('./types.js').StageConfig> = {
  collect: {
    description: 'Gather data from sources (logs, APIs, databases)',
    canFail: true,
    retryOnFail: true,
    maxRetries: 2,
  },
  analyze: {
    description: 'Process collected data, find patterns, generate insights',
    canFail: false,
    requiredData: true,
  },
  execute: {
    description: 'Apply changes (auto-fix, create tasks)',
    canFail: true,
    rollbackOnFail: true,
  },
  verify: {
    description: 'Validate results, run quality gate',
    canFail: false,
    required: true,
  },
  publish: {
    description: 'Save to Notion, send notifications',
    canFail: true,
    retryOnFail: true,
    maxRetries: 3,
  },
};

// ============================================================================
// Quality Gate & Deduplication
// ============================================================================

export const qualityGate = {
  enabled: true,
  minScore: 60,
  validatorPath: `${ELIO_ROOT}/core/report-validator.ts`,
  onFail: 'retry' as const,
  maxRetries: 2,
};

export const deduplication = {
  enabled: true,
  checkBeforeCreate: true,
  matchBy: 'title' as const,
  caseSensitive: false,
};

// Legacy: keep team export for backward compatibility
export const team: Record<string, TeamMember> = {};

// ============================================================================
// Helper Functions
// ============================================================================

export function getEnabledReviews(): [string, ReviewConfig][] {
  return Object.entries(reviews).filter(([_, r]) => r.enabled);
}

export function getEnabledCollectors(): [string, Collector][] {
  return Object.entries(collectors).filter(([_, c]) => c.enabled);
}

export function getEnabledScripts(): ScheduledScript[] {
  return scheduledScripts.filter(s => s.enabled);
}

export function getReviewConfig(name: string): ReviewConfig | undefined {
  return reviews[name];
}

export function getNightlyOrder(): string[] {
  return ['system-review', 'product-review'];
}

// Legacy helpers
export function getEnabledMembers(): [string, TeamMember][] {
  return [];
}

export function getMemberByTrigger(_trigger: string): [string, TeamMember] | undefined {
  return undefined;
}

export function getExecutionOrder(): string[] {
  return getNightlyOrder();
}
