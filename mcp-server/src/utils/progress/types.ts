/**
 * Progress Types
 */

export interface ProgressStage {
  name: string;
  percent: number;
}

export interface RunProgress {
  runId: string;
  task: string;
  stages: ProgressStage[];
  currentStage: number;
  status: 'running' | 'completed' | 'failed';
  startedAt: Date;
  error?: string;
  result?: {
    type: 'notion' | 'file' | 'message';
    url?: string;
    path?: string;
  };
}
