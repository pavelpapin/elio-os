/**
 * ESLint auto-fixer
 * Runs eslint --fix — idempotent and safe
 */

import { exec } from '../exec.js';
import type { FixResult } from '../types.js';

export function fixEslint(projectPath: string): FixResult {
  const result = exec(
    `cd ${projectPath} && npx eslint . --fix 2>&1`,
    120_000,
  );

  return {
    actionId: 'eslint-fix',
    description: 'eslint --fix on project',
    success: result.exitCode === 0 || result.exitCode === 1,
    output: result.stdout.slice(0, 2000),
  };
}
