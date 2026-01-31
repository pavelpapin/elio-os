/**
 * Build & test verification + rollback
 */

import { exec } from './exec.js';
import type { VerifyResult } from './types.js';

export function verify(basePath: string, headBefore: string): VerifyResult {
  const mcp = `${basePath}/mcp-server`;

  const buildResult = exec(`cd ${mcp} && pnpm build 2>&1`, 120_000);
  const testResult = exec(`cd ${mcp} && pnpm test 2>&1`, 120_000);

  // Diff against HEAD before fixes — shows actual changes made
  const diffResult = exec(
    `git -C ${basePath} diff --stat ${headBefore} 2>/dev/null`,
  );
  const diffStats = parseDiffStats(diffResult.stdout);

  return {
    buildPassed: buildResult.exitCode === 0,
    testsPassed: testResult.exitCode === 0,
    buildOutput: buildResult.stdout.slice(-2000),
    testOutput: testResult.stdout.slice(-2000),
    diffStats,
  };
}

export function rollback(basePath: string, headSha: string): void {
  exec(`git -C ${basePath} checkout ${headSha} -- .`);
}

export function commitAndPush(basePath: string): { success: boolean; output: string } {
  const date = new Date().toISOString().split('T')[0];
  const addResult = exec(`git -C ${basePath} add -A`);
  if (addResult.exitCode !== 0) {
    return { success: false, output: addResult.stdout };
  }

  const diffCheck = exec(`git -C ${basePath} diff --cached --quiet`);
  if (diffCheck.exitCode === 0) {
    return { success: true, output: 'No changes to commit' };
  }

  const commitResult = exec(
    `git -C ${basePath} commit -m "chore: nightly auto-fixes ${date}"`,
  );
  if (commitResult.exitCode !== 0) {
    return { success: false, output: commitResult.stdout };
  }

  const pushResult = exec(`git -C ${basePath} push origin main 2>&1`, 30_000);
  return { success: pushResult.exitCode === 0, output: pushResult.stdout };
}

function parseDiffStats(output: string) {
  const match = output.match(
    /(\d+) files? changed(?:, (\d+) insertions?)?(?:, (\d+) deletions?)?/,
  );
  if (!match) return { files: 0, insertions: 0, deletions: 0 };
  return {
    files: parseInt(match[1], 10) || 0,
    insertions: parseInt(match[2], 10) || 0,
    deletions: parseInt(match[3], 10) || 0,
  };
}
