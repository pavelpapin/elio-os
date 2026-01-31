/**
 * Code Review Types
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type IssueCategory =
  | 'security'
  | 'architecture'
  | 'quality'
  | 'performance'
  | 'dependency'
  | 'style';

export interface Issue {
  id: string;
  category: IssueCategory;
  severity: Severity;
  title: string;
  description: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export interface SecurityCheck {
  name: string;
  pattern: RegExp;
  severity: Severity;
  description: string;
  suggestion: string;
}

export interface ArchitectureRule {
  name: string;
  check: (stats: FileStats) => boolean;
  severity: Severity;
  description: string;
}

export interface FileStats {
  path: string;
  lines: number;
  functions: number;
  maxFunctionLength: number;
  hasAnyType: boolean;
  imports: string[];
}

export interface DependencyInfo {
  name: string;
  version: string;
  latest?: string;
  vulnerabilities?: VulnerabilityInfo[];
}

export interface VulnerabilityInfo {
  severity: Severity;
  title: string;
  url?: string;
}

export interface ReviewResult {
  timestamp: string;
  path: string;
  issues: Issue[];
  stats: ReviewStats;
  summary: string;
}

export interface ReviewStats {
  totalFiles: number;
  totalLines: number;
  issuesBySeverity: Record<Severity, number>;
  issuesByCategory: Record<IssueCategory, number>;
}

export interface ReviewConfig {
  maxFileLines: number;
  maxFunctionLines: number;
  checkSecurity: boolean;
  checkArchitecture: boolean;
  checkQuality: boolean;
  checkDependencies: boolean;
  excludePatterns: string[];
}

export const DEFAULT_CONFIG: ReviewConfig = {
  maxFileLines: 200,
  maxFunctionLines: 50,
  checkSecurity: true,
  checkArchitecture: true,
  checkQuality: true,
  checkDependencies: true,
  excludePatterns: ['node_modules', 'dist', '.git', 'coverage'],
};
