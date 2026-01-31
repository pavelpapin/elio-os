/**
 * Skills Type Definitions
 */

export interface SkillInput {
  [key: string]: unknown;
}

export interface SkillOutput {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  inputs: Record<string, {
    type: string;
    required: boolean;
    default?: unknown;
    description: string;
  }>;
  outputs: Record<string, {
    type: string;
    description: string;
  }>;
  tags: string[];
  timeout: number;
}

export interface Skill<TInput = SkillInput, TOutput = unknown> {
  metadata: SkillMetadata;
  execute: (input: TInput) => Promise<TOutput>;
}

/** Type-erased skill for registry use (avoids `any`) */
export interface AnySkill {
  metadata: SkillMetadata;
  execute: (input: unknown) => Promise<unknown>;
}

// Auto-test types
export interface AutoTestInput {
  scope?: 'quick' | 'changed' | 'full';
}

export interface AutoTestOutput {
  version: string;
  scope: string;
  passed: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    pass_rate: number;
  };
  passed_tests: string[];
  failures: string[];
  skipped_tests: string[];
}

// Smoke-test types
export interface SmokeTestInput {
  mode?: 'check' | 'fix' | 'report';
}

export interface IntegrationStatus {
  status: 'ok' | 'no_credentials' | 'invalid_credentials' | 'api_error' | 'not_authenticated';
  latency_ms?: number;
  note?: string;
  message?: string;
}

export interface SmokeTestOutput {
  timestamp: string;
  mode: string;
  integrations: Record<string, IntegrationStatus>;
  skills: {
    passed: number;
    failed: number;
    fixed: number;
  };
  workflows: {
    passed: number;
    failed: number;
  };
  build: {
    status: string;
  };
  fixes_applied: string[];
  overall: 'healthy' | 'degraded' | 'unhealthy';
}

// Web-search types
export interface WebSearchInput {
  query: string;
  numResults?: number;
  site?: string;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchOutput {
  query: string;
  results: WebSearchResult[];
  total: number;
  source: string;
}

// Code cleanup types
export interface CodeCleanupInput {
  path?: string;
  dryRun?: boolean;
}

export interface CodeCleanupOutput {
  cleaned: string[];
  errors: string[];
  skipped: string[];
}

// Disk cleanup types
export interface DiskCleanupInput {
  dryRun?: boolean;
}

export interface DiskCleanupOutput {
  freed_mb: number;
  items_removed: string[];
  errors: string[];
}

// Git maintenance types
export interface GitMaintenanceInput {
  repo?: string;
  dryRun?: boolean;
}

export interface GitMaintenanceOutput {
  pruned_branches: string[];
  gc_result: string;
  errors: string[];
}

// Dep maintenance types
export interface DepMaintenanceInput {
  check?: boolean;
  update?: boolean;
}

export interface DepMaintenanceOutput {
  outdated: Array<{
    name: string;
    current: string;
    wanted: string;
    latest: string;
  }>;
  updated: string[];
  errors: string[];
}
