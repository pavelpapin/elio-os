/**
 * Test coverage collector
 * Runs tests with coverage, parses results
 */

import { exec } from '../exec.js';
import type { TestCoverageData } from '../types.js';

export function collectTestCoverage(projectPath: string): TestCoverageData {
  const result = exec(
    `cd ${projectPath} && pnpm test -- --coverage --reporter=json 2>/dev/null`,
    120_000,
  );

  const testStats = parseTestStats(projectPath);
  const coverage = parseCoverage(result.stdout);

  return {
    overall: coverage.overall,
    lowCoverageFiles: coverage.lowCoverageFiles,
    untestedFiles: findUntestedFiles(projectPath),
    testStats,
  };
}

function parseTestStats(projectPath: string): TestCoverageData['testStats'] {
  const result = exec(
    `cd ${projectPath} && pnpm test --reporter=json 2>/dev/null`,
    120_000,
  );

  try {
    const json = JSON.parse(result.stdout);
    return {
      total: json.numTotalTests ?? 0,
      passed: json.numPassedTests ?? 0,
      failed: json.numFailedTests ?? 0,
      skipped: json.numPendingTests ?? 0,
    };
  } catch {
    // Try vitest format
    const totalMatch = result.stdout.match(/Tests\s+(\d+)\s+passed/);
    const failedMatch = result.stdout.match(/(\d+)\s+failed/);
    const total = parseInt(totalMatch?.[1] ?? '0', 10);
    const failed = parseInt(failedMatch?.[1] ?? '0', 10);
    return { total: total + failed, passed: total, failed, skipped: 0 };
  }
}

interface CoverageResult {
  overall: TestCoverageData['overall'];
  lowCoverageFiles: TestCoverageData['lowCoverageFiles'];
}

function parseCoverage(stdout: string): CoverageResult {
  const empty = {
    overall: { lines: 0, branches: 0, functions: 0, statements: 0 },
    lowCoverageFiles: [],
  };

  try {
    const json = JSON.parse(stdout);
    const totals = json.total ?? json.coverageMap?.total;
    if (totals) {
      return {
        overall: {
          lines: totals.lines?.pct ?? 0,
          branches: totals.branches?.pct ?? 0,
          functions: totals.functions?.pct ?? 0,
          statements: totals.statements?.pct ?? 0,
        },
        lowCoverageFiles: extractLowCoverage(json),
      };
    }
  } catch {}

  return empty;
}

function extractLowCoverage(json: Record<string, unknown>): TestCoverageData['lowCoverageFiles'] {
  const files: TestCoverageData['lowCoverageFiles'] = [];
  const entries = (json as Record<string, Record<string, { pct?: number }>>);

  for (const [filePath, data] of Object.entries(entries)) {
    if (filePath === 'total' || typeof data !== 'object' || !data) continue;
    const linesPct = (data as Record<string, { pct?: number }>).lines?.pct;
    if (typeof linesPct === 'number' && linesPct < 50 && linesPct >= 0) {
      files.push({ file: filePath, lines: linesPct });
    }
  }

  return files.slice(0, 30);
}

function findUntestedFiles(projectPath: string): string[] {
  const srcFiles = exec(
    `find ${projectPath}/src -name "*.ts" -not -name "*.test.ts" -not -name "*.d.ts" -not -path "*/node_modules/*" | head -200`,
  );
  if (!srcFiles.stdout) return [];

  const untested: string[] = [];
  for (const file of srcFiles.stdout.split('\n').filter(Boolean)) {
    const testFile = file.replace(/\.ts$/, '.test.ts');
    const checkResult = exec(`test -f "${testFile}" && echo "exists"`);
    if (!checkResult.stdout.includes('exists')) {
      untested.push(file.replace(`${projectPath}/`, ''));
    }
  }

  return untested.slice(0, 50);
}
