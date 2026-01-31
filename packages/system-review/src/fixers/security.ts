/**
 * Security auto-fixer
 * Runs pnpm audit fix for non-breaking updates
 */

import { exec } from '../exec.js';
import type { FixResult } from '../types.js';

export function fixSecurity(projectPath: string): FixResult {
  const result = exec(
    `cd ${projectPath} && pnpm audit fix 2>&1`,
    120_000,
  );

  return {
    actionId: 'security-fix',
    description: 'pnpm audit fix (non-breaking)',
    success: result.exitCode === 0,
    output: result.stdout.slice(0, 2000),
  };
}
