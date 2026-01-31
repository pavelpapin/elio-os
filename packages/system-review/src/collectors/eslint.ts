/**
 * ESLint data collector
 * Runs eslint --format json, parses structured output
 */

import { exec } from '../exec.js';
import type { EslintData } from '../types.js';

export function collectEslint(projectPath: string): EslintData {
  const result = exec(
    `cd ${projectPath} && npx eslint . --format json 2>/dev/null`,
    120_000,
  );

  const data: EslintData = {
    errorCount: 0,
    warningCount: 0,
    fixableCount: 0,
    issues: [],
  };

  if (!result.stdout || !result.stdout.startsWith('[')) return data;

  try {
    const parsed = JSON.parse(result.stdout) as EslintJsonEntry[];
    for (const file of parsed) {
      data.errorCount += file.errorCount ?? 0;
      data.warningCount += file.warningCount ?? 0;
      data.fixableCount +=
        (file.fixableErrorCount ?? 0) + (file.fixableWarningCount ?? 0);

      for (const msg of file.messages ?? []) {
        data.issues.push({
          file: file.filePath,
          line: msg.line ?? 0,
          ruleId: msg.ruleId ?? null,
          message: msg.message ?? '',
          severity: msg.severity ?? 1,
          fixable: !!msg.fix,
        });
      }
    }
  } catch {
    // JSON parse failed — return empty
  }

  return data;
}

interface EslintJsonEntry {
  filePath: string;
  errorCount?: number;
  warningCount?: number;
  fixableErrorCount?: number;
  fixableWarningCount?: number;
  messages?: Array<{
    line?: number;
    ruleId?: string;
    message?: string;
    severity?: number;
    fix?: unknown;
  }>;
}
