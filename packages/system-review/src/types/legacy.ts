/**
 * System Review — Legacy Types (v1)
 * Types used by the old analyzer module (kept for backward compatibility)
 */

// Re-export InfraData as InfraMetrics (legacy alias)
export type { InfraData as InfraMetrics } from './collectors.js';

/**
 * Legacy system issue structure (v1)
 */
export interface SystemIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'code' | 'architecture' | 'security' | 'infra';
  title: string;
  description: string;
  file?: string;
  line?: number;
  autoFixable: boolean;
  suggestion?: string;
}

/**
 * Legacy review summary (v1)
 */
export interface ReviewSummary {
  codeIssues: number;
  architectureIssues: number;
  securityIssues: number;
  infraIssues: number;
  autoFixed: number;
}

/**
 * Legacy system review config (v1)
 */
export interface SystemReviewConfig {
  scope: 'full' | 'code' | 'architecture' | 'security' | 'infra';
  since: string;
  targetPath: string;
  autoFix: boolean;
}

/**
 * Legacy system review result (v1)
 * Note: This is different from the v2 SystemReviewResult in execute.ts
 */
export interface SystemReviewResultV1 {
  timestamp: string;
  period: string;
  healthScore: number;
  healthLevel: 'excellent' | 'good' | 'warning' | 'poor' | 'critical';
  issues: SystemIssue[];
  infraMetrics: {
    diskUsagePercent: number;
    ramUsagePercent: number;
    swapUsagePercent: number;
    failedServices: string[];
    uptimeHours: number;
  };
  summary: ReviewSummary;
  recommendations: string[];
}

// Export as SystemReviewResult for backward compatibility with analyzer files
export type SystemReviewResult = SystemReviewResultV1;
