/**
 * Type definitions for Consilium multi-model code review
 */

// ============ Configuration ============

export const CONFIG = {
  outputDir: '/root/.claude/logs/consilium',
  claudeDir: '/root/.claude',
  maxFilesPerReview: 10,
  maxLinesPerFile: 500,
};

// ============ Types ============

export interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'security' | 'architecture' | 'performance' | 'quality';
  file: string;
  line?: number;
  issue: string;
  suggestion: string;
}

export interface ModelAnalysis {
  model: string;
  findings: Finding[];
  summary: string;
  timestamp: string;
}

export interface ConsiliumResult {
  date: string;
  reason: string;
  focus_areas: string[];
  analyses: ModelAnalysis[];
  consensus: Array<{
    issue: string;
    agreed_by: string[];
    severity: string;
    confidence: 'high' | 'medium' | 'low';
    action: 'auto_fix' | 'propose' | 'escalate';
  }>;
  disagreements: Array<{
    issue: string;
    opinions: Record<string, string>;
    action: 'human_review';
  }>;
  actions_taken: {
    auto_fixed: number;
    proposed: number;
    escalated: number;
  };
}
