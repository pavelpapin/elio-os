/**
 * System Review v2 — Default Values
 * Default data for failed collectors
 */

import type {
  GitData,
  TypescriptData,
  EslintData,
  ArchitectureData,
  SecurityData,
  InfraData,
  MaintenanceData,
  TestCoverageData,
  DependenciesData,
  CodeQualityData,
  ConsistencyData,
  RuntimeHealthData,
  HistoryData,
} from './collectors.js';

// ─── Defaults for failed collectors ─────────────────────────────

export const DEFAULT_GIT: GitData = {
  commitCount24h: 0,
  filesChanged: [],
  diffStats: { insertions: 0, deletions: 0, filesChanged: 0 },
  hasUncommittedChanges: false,
  currentBranch: 'unknown',
  headSha: 'unknown',
};

export const DEFAULT_TYPESCRIPT: TypescriptData = {
  success: true,
  diagnostics: [],
  errorCount: 0,
};

export const DEFAULT_ESLINT: EslintData = {
  errorCount: 0,
  warningCount: 0,
  fixableCount: 0,
  issues: [],
};

export const DEFAULT_ARCHITECTURE: ArchitectureData = {
  oversizedFiles: [],
  longFunctions: [],
  totalFiles: 0,
  circularDeps: [],
  orphanFiles: [],
  importViolations: [],
  unusedDeps: [],
  unusedExports: 0,
  patternInconsistencies: [],
  moduleCoupling: [],
};

export const DEFAULT_SECURITY: SecurityData = {
  npmAudit: {
    total: 0, critical: 0, high: 0, moderate: 0, low: 0,
    vulnerabilities: [],
  },
  secretsFound: [],
  nodeVersionOutdated: false,
  nodeVersion: 'unknown',
  secretsWorldReadable: [],
};

export const DEFAULT_INFRA: InfraData = {
  diskUsagePercent: 0,
  ramUsagePercent: 0,
  swapUsagePercent: 0,
  failedServices: [],
  uptimeHours: 0,
};

export const DEFAULT_MAINTENANCE: MaintenanceData = {
  oldLogFiles: [],
  cacheSizeMb: 0,
  gitGarbageMb: 0,
};

export const DEFAULT_TEST_COVERAGE: TestCoverageData = {
  overall: { lines: 0, branches: 0, functions: 0, statements: 0 },
  lowCoverageFiles: [],
  untestedFiles: [],
  testStats: { total: 0, passed: 0, failed: 0, skipped: 0 },
};

export const DEFAULT_DEPENDENCIES: DependenciesData = {
  outdated: [],
  maxDepth: 0,
  duplicates: [],
  licenseIssues: [],
};

export const DEFAULT_CODE_QUALITY: CodeQualityData = {
  duplicatePercent: 0,
  highComplexityFunctions: [],
  todoCount: 0,
  todos: [],
  anyTypeCount: 0,
  consoleLogCount: 0,
};

export const DEFAULT_CONSISTENCY: ConsistencyData = {
  registryMismatches: [],
  missingDocs: [],
  staleFiles: [],
  staleContextFiles: [],
  docsConsistency: [],
};

export const DEFAULT_RUNTIME_HEALTH: RuntimeHealthData = {
  mcpServerUp: false,
  cronJobsActive: false,
  cronLastRun: null,
  integrations: [],
  secretsStatus: [],
};

export const DEFAULT_HISTORY: HistoryData = {
  recentScores: [],
  trend: 'stable',
  recurringIssues: [],
};
