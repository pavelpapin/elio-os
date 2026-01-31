/**
 * Post-Run Analyzer Types
 */

export interface ImprovementTask {
  id: string;
  createdAt: string;
  sourceRunId: string;
  workflowType: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'data_source' | 'workflow' | 'quality' | 'performance' | 'config';
  title: string;
  description: string;
  suggestedFix?: string;
  relatedIssues: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'wont_fix';
  resolution?: string;
}

export interface AnalysisReport {
  runId: string;
  analyzedAt: string;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    dataQuality: number;
    verificationRate: number;
    overallHealth: 'good' | 'degraded' | 'poor';
  };
  issueBreakdown: Record<string, number>;
  topProblems: string[];
  suggestions: string[];
  improvementTasks: ImprovementTask[];
  nightlyTasks: string[];
}
