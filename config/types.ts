/**
 * System Configuration - Type Definitions
 */

export type StageType = 'collect' | 'analyze' | 'execute' | 'verify' | 'publish';

export interface StageConfig {
  description: string;
  canFail: boolean;
  retryOnFail?: boolean;
  maxRetries?: number;
  requiredData?: boolean;
  rollbackOnFail?: boolean;
  required?: boolean;
}

export interface AutoFixPermissions {
  enabled: boolean;
  scope: string[];
  fileTypes?: string[];
  excludePaths?: string[];
  maxChanges: number;
}

export interface TeamMember {
  enabled: boolean;
  name: string;
  description: string;
  schedule: {
    cron: string;
    after?: string;
    description: string;
  };
  triggers: string[];
  permissions: {
    autoFix?: AutoFixPermissions;
    assignTasks?: { enabled: boolean; to: string[] };
    changePriorities?: boolean;
    propose: boolean;
    escalate: boolean;
  };
  reports: {
    telegram: boolean;
    notion: boolean;
    notionDb: string;
    notionDbId: string;
  };
  backlog?: {
    type: 'technical' | 'product';
    storage: 'database';
    table: string;
    notionSync: boolean;
    notionDb: string;
    notionDbId: string;
  };
  feedbackSources?: string[];
  manages?: string[];
}

export interface Collector {
  enabled: boolean;
  name: string;
  description: string;
  schedule: {
    cron: string;
    description: string;
  };
  workflow: string;
  outputs: {
    path: string;
    notify: boolean;
  };
}

export interface ScheduledScript {
  name: string;
  description: string;
  script: string;
  cron: string;
  timezone: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface ReviewConfig {
  enabled: boolean;
  name: string;
  description: string;
  workflow: string;
  schedule: {
    cron: string;
    description: string;
  };
  permissions: {
    autoFix: AutoFixPermissions;
  };
  reports: {
    telegram: boolean;
    notion: boolean;
    notionDb: string;
    notionDbId: string;
    localPath: string;
  };
  backlog: {
    type: 'technical' | 'product';
    notionSync: boolean;
    notionDb: string;
    notionDbId: string;
  };
}
