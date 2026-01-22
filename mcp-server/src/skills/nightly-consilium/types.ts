/**
 * Nightly Consilium Types
 * Type definitions for multi-model code review system
 */

export const ANALYSIS_CATEGORIES = [
  'code_quality',
  'security',
  'performance',
  'architecture',
  'documentation',
  'testing',
  'reliability',
  'observability'
] as const;

export type AnalysisCategory = typeof ANALYSIS_CATEGORIES[number];

export interface Issue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file: string;
  line?: number;
  description: string;
  suggestion: string;
  autoFixable: boolean;
}

export interface CategoryAnalysis {
  score: number;
  issues: Issue[];
}

export interface AutoFix {
  type: string;
  file: string;
  description: string;
}

export interface ModelAnalysis {
  model: string;
  timestamp: string;
  analysis: Record<AnalysisCategory, CategoryAnalysis>;
  priorities: string[];
  autoFixes: AutoFix[];
}

export interface ConsensusItem {
  action: string;
  votes: number;
  priority: number;
}

export interface ConsiliumResult {
  runId: string;
  timestamp: string;
  models: ModelAnalysis[];
  consensus: ConsensusItem[];
  appliedFixes: string[];
  manualReviewRequired: string[];
  scoreChanges: Record<AnalysisCategory, { before: number; after: number }>;
}

export interface DailyChanges {
  changedFiles: string[];
  gitDiff: string;
  errorLogs: string[];
  metrics: Record<string, unknown>;
}
