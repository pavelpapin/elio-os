/**
 * System Review v2 — Collector Schemas
 * Individual collector output types and schemas
 */

import { z } from 'zod';

// ─── Git Collector ──────────────────────────────────────────────

export const GitDataSchema = z.object({
  commitCount24h: z.number(),
  filesChanged: z.array(z.string()),
  diffStats: z.object({
    insertions: z.number(),
    deletions: z.number(),
    filesChanged: z.number(),
  }),
  hasUncommittedChanges: z.boolean(),
  currentBranch: z.string(),
  headSha: z.string(),
});
export type GitData = z.infer<typeof GitDataSchema>;

// ─── TypeScript Collector ───────────────────────────────────────

export const TscDiagnosticSchema = z.object({
  file: z.string(),
  line: z.number(),
  code: z.number(),
  message: z.string(),
});

export const TypescriptDataSchema = z.object({
  success: z.boolean(),
  diagnostics: z.array(TscDiagnosticSchema),
  errorCount: z.number(),
});
export type TypescriptData = z.infer<typeof TypescriptDataSchema>;

// ─── ESLint Collector ───────────────────────────────────────────

export const EslintIssueSchema = z.object({
  file: z.string(),
  line: z.number(),
  ruleId: z.string().nullable(),
  message: z.string(),
  severity: z.number(),
  fixable: z.boolean(),
});

export const EslintDataSchema = z.object({
  errorCount: z.number(),
  warningCount: z.number(),
  fixableCount: z.number(),
  issues: z.array(EslintIssueSchema),
});
export type EslintData = z.infer<typeof EslintDataSchema>;

// ─── Architecture Collector ─────────────────────────────────────

export const FileMetricsSchema = z.object({
  path: z.string(),
  lines: z.number(),
});

export const LongFunctionSchema = z.object({
  file: z.string(),
  functionName: z.string(),
  lines: z.number(),
});

export const CircularDepSchema = z.object({
  cycle: z.array(z.string()),
});

export const ImportViolationSchema = z.object({
  file: z.string(),
  imports: z.string(),
  rule: z.string(),
});

export const ArchitectureDataSchema = z.object({
  oversizedFiles: z.array(FileMetricsSchema),
  longFunctions: z.array(LongFunctionSchema),
  totalFiles: z.number(),
  circularDeps: z.array(CircularDepSchema),
  orphanFiles: z.array(z.string()),
  importViolations: z.array(ImportViolationSchema),
  unusedDeps: z.array(z.string()),
  unusedExports: z.number(),
  patternInconsistencies: z.array(z.object({ module: z.string(), issue: z.string() })),
  moduleCoupling: z.array(z.object({ module: z.string(), fanIn: z.number(), fanOut: z.number() })),
});
export type ArchitectureData = z.infer<typeof ArchitectureDataSchema>;

// ─── Security Collector ─────────────────────────────────────────

export const VulnSchema = z.object({
  name: z.string(),
  severity: z.string(),
  title: z.string(),
  url: z.string().optional(),
  fixAvailable: z.boolean(),
});

export const SecretFindingSchema = z.object({
  file: z.string(),
  line: z.number(),
  pattern: z.string(),
});

export const SecurityDataSchema = z.object({
  npmAudit: z.object({
    total: z.number(),
    critical: z.number(),
    high: z.number(),
    moderate: z.number(),
    low: z.number(),
    vulnerabilities: z.array(VulnSchema),
  }),
  secretsFound: z.array(SecretFindingSchema),
  nodeVersionOutdated: z.boolean(),
  nodeVersion: z.string(),
  secretsWorldReadable: z.array(z.string()),
});
export type SecurityData = z.infer<typeof SecurityDataSchema>;

// ─── Infrastructure Collector ───────────────────────────────────

export const InfraDataSchema = z.object({
  diskUsagePercent: z.number(),
  ramUsagePercent: z.number(),
  swapUsagePercent: z.number(),
  failedServices: z.array(z.string()),
  uptimeHours: z.number(),
});
export type InfraData = z.infer<typeof InfraDataSchema>;

// ─── Maintenance Collector ──────────────────────────────────────

export const OldLogFileSchema = z.object({
  path: z.string(),
  ageDays: z.number(),
  sizeMb: z.number(),
});

export const MaintenanceDataSchema = z.object({
  oldLogFiles: z.array(OldLogFileSchema),
  cacheSizeMb: z.number(),
  gitGarbageMb: z.number(),
});
export type MaintenanceData = z.infer<typeof MaintenanceDataSchema>;

// ─── Test Coverage Collector ────────────────────────────────────

export const TestCoverageDataSchema = z.object({
  overall: z.object({
    lines: z.number(),
    branches: z.number(),
    functions: z.number(),
    statements: z.number(),
  }),
  lowCoverageFiles: z.array(z.object({ file: z.string(), lines: z.number() })),
  untestedFiles: z.array(z.string()),
  testStats: z.object({
    total: z.number(),
    passed: z.number(),
    failed: z.number(),
    skipped: z.number(),
  }),
});
export type TestCoverageData = z.infer<typeof TestCoverageDataSchema>;

// ─── Dependencies Collector ─────────────────────────────────────

export const OutdatedDepSchema = z.object({
  name: z.string(),
  current: z.string(),
  latest: z.string(),
  type: z.enum(['major', 'minor', 'patch']),
});

export const DependenciesDataSchema = z.object({
  outdated: z.array(OutdatedDepSchema),
  maxDepth: z.number(),
  duplicates: z.array(z.string()),
  licenseIssues: z.array(z.object({ name: z.string(), license: z.string() })),
});
export type DependenciesData = z.infer<typeof DependenciesDataSchema>;

// ─── Code Quality Collector ─────────────────────────────────────

export const CodeQualityDataSchema = z.object({
  duplicatePercent: z.number(),
  highComplexityFunctions: z.array(z.object({
    file: z.string(),
    functionName: z.string(),
    complexity: z.number(),
  })),
  todoCount: z.number(),
  todos: z.array(z.object({ file: z.string(), line: z.number(), text: z.string() })),
  anyTypeCount: z.number(),
  consoleLogCount: z.number(),
});
export type CodeQualityData = z.infer<typeof CodeQualityDataSchema>;

// ─── Consistency Collector ──────────────────────────────────────

export const ConsistencyDataSchema = z.object({
  registryMismatches: z.array(z.object({ entity: z.string(), issue: z.string() })),
  missingDocs: z.array(z.object({ entity: z.string(), expected: z.string() })),
  staleFiles: z.array(z.object({ path: z.string(), daysSinceModified: z.number() })),
  staleContextFiles: z.array(z.object({ path: z.string(), daysSinceModified: z.number() })),
  docsConsistency: z.array(z.object({
    file: z.string(),
    issue: z.string(),
    details: z.string().optional(),
  })),
});
export type ConsistencyData = z.infer<typeof ConsistencyDataSchema>;

// ─── Runtime Health Collector ───────────────────────────────────

export const RuntimeHealthDataSchema = z.object({
  mcpServerUp: z.boolean(),
  cronJobsActive: z.boolean(),
  cronLastRun: z.string().nullable(),
  integrations: z.array(z.object({
    name: z.string(),
    healthy: z.boolean(),
    error: z.string().optional(),
  })),
  secretsStatus: z.array(z.object({
    name: z.string(),
    exists: z.boolean(),
    nonEmpty: z.boolean(),
  })),
});
export type RuntimeHealthData = z.infer<typeof RuntimeHealthDataSchema>;

// ─── History Collector ──────────────────────────────────────────

export const HistoryDataSchema = z.object({
  recentScores: z.array(z.object({ date: z.string(), score: z.number() })),
  trend: z.enum(['improving', 'stable', 'degrading']),
  recurringIssues: z.array(z.object({ issue: z.string(), occurrences: z.number() })),
});
export type HistoryData = z.infer<typeof HistoryDataSchema>;
