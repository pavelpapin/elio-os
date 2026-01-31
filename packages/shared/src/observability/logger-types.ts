/**
 * Workflow Logger Types
 */

// Issue types (non-technical, semantic problems)
export type IssueType =
  | 'data_source_failed'      // Source returned empty/error
  | 'data_source_blocked'     // Source actively blocked us
  | 'data_incomplete'         // Got data but missing key fields
  | 'data_stale'              // Data is outdated
  | 'data_conflict'           // Multiple sources disagree
  | 'verification_failed'     // Couldn't verify with 2+ sources
  | 'quality_low'             // Result quality below threshold
  | 'timeout'                 // Operation took too long
  | 'rate_limited'            // Hit rate limit
  | 'missing_context'         // Needed info not available
  | 'tool_mismatch'           // Tool returned unexpected format
  | 'workflow_stuck'          // Agent couldn't proceed
  | 'user_feedback_negative'; // User indicated bad result

export type IssueSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface WorkflowIssue {
  timestamp: string;
  runId: string;
  workflowType: string;
  stage: string;
  issueType: IssueType;
  severity: IssueSeverity;
  message: string;
  context: {
    source?: string;
    query?: string;
    expected?: string;
    actual?: string;
    suggestion?: string;
    [key: string]: unknown;
  };
}

export interface RunSummary {
  runId: string;
  workflowType: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'partial';
  topic?: string;
  stages: StageLog[];
  issues: WorkflowIssue[];
  metrics: {
    totalSources: number;
    successfulSources: number;
    failedSources: number;
    dataQualityScore?: number;
    verificationRate?: number;
  };
  deliverable?: {
    type: string;
    url?: string;
    path?: string;
  };
}

export interface StageLog {
  stage: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  details?: string;
}
