/**
 * System Review v2 — Review & Fix Types
 * Composite review data, fix plans, and result interfaces
 */

import { z } from 'zod';
import {
  GitDataSchema,
  TypescriptDataSchema,
  EslintDataSchema,
  ArchitectureDataSchema,
  SecurityDataSchema,
  InfraDataSchema,
  MaintenanceDataSchema,
  TestCoverageDataSchema,
  DependenciesDataSchema,
  CodeQualityDataSchema,
  ConsistencyDataSchema,
  RuntimeHealthDataSchema,
  HistoryDataSchema,
} from './collectors.js';

// ─── Composite Review Data ──────────────────────────────────────

export const ReviewDataSchema = z.object({
  timestamp: z.string(),
  git: GitDataSchema,
  typescript: TypescriptDataSchema,
  eslint: EslintDataSchema,
  architecture: ArchitectureDataSchema,
  security: SecurityDataSchema,
  infra: InfraDataSchema,
  maintenance: MaintenanceDataSchema,
  testCoverage: TestCoverageDataSchema,
  dependencies: DependenciesDataSchema,
  codeQuality: CodeQualityDataSchema,
  consistency: ConsistencyDataSchema,
  runtimeHealth: RuntimeHealthDataSchema,
  history: HistoryDataSchema,
});
export type ReviewData = z.infer<typeof ReviewDataSchema>;

// ─── Fix Plan (Claude output) ───────────────────────────────────

export const FixActionSchema = z.object({
  id: z.string(),
  type: z.enum(['auto-fix', 'backlog', 'skip']),
  category: z.enum([
    'typescript', 'eslint', 'security',
    'architecture', 'infra', 'maintenance', 'git',
    'dependencies', 'code-quality', 'testing', 'consistency', 'infrastructure',
  ]),
  description: z.string(),
  reason: z.string(),
  command: z.string().optional(),
  file: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
});
export type FixAction = z.infer<typeof FixActionSchema>;

export const FixPlanSchema = z.object({
  actions: z.array(FixActionSchema),
  healthAssessment: z.string(),
  score: z.number().min(0).max(100),
});
export type FixPlan = z.infer<typeof FixPlanSchema>;

// ─── Fix Result ─────────────────────────────────────────────────

export interface FixResult {
  actionId: string;
  description: string;
  success: boolean;
  output: string;
}

// ─── Verification ───────────────────────────────────────────────

export interface VerifyResult {
  buildPassed: boolean;
  testsPassed: boolean;
  buildOutput: string;
  testOutput: string;
  diffStats: { insertions: number; deletions: number; files: number };
}

// ─── Health ─────────────────────────────────────────────────────

export type HealthLevel =
  | 'excellent'
  | 'good'
  | 'warning'
  | 'poor'
  | 'critical';
