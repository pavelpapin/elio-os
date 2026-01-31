/**
 * Git data collector
 * Deterministic: runs git commands, parses output
 */

import { exec } from '../exec.js';
import type { GitData } from '../types.js';

export function collectGit(repoPath: string): GitData {
  const run = (cmd: string) => exec(cmd, 10_000);

  const headSha = run(`git -C ${repoPath} rev-parse HEAD`).stdout || 'unknown';
  const branch = run(`git -C ${repoPath} branch --show-current`).stdout || 'unknown';

  const logResult = run(
    `git -C ${repoPath} log --since="24 hours ago" --oneline`
  );
  const commits = logResult.stdout
    ? logResult.stdout.split('\n').filter(Boolean)
    : [];

  const diffStatResult = run(
    `git -C ${repoPath} diff --stat HEAD~${Math.max(commits.length, 1)} HEAD 2>/dev/null`
  );
  const diffStats = parseDiffStats(diffStatResult.stdout);

  const statusResult = run(`git -C ${repoPath} status --porcelain`);
  const hasUncommitted = statusResult.stdout.length > 0;

  const changedFilesResult = run(
    `git -C ${repoPath} log --since="24 hours ago" --name-only --pretty=format:""`
  );
  const filesChanged = changedFilesResult.stdout
    ? [...new Set(changedFilesResult.stdout.split('\n').filter(Boolean))]
    : [];

  return {
    commitCount24h: commits.length,
    filesChanged,
    diffStats,
    hasUncommittedChanges: hasUncommitted,
    currentBranch: branch,
    headSha,
  };
}

function parseDiffStats(output: string): GitData['diffStats'] {
  const match = output.match(
    /(\d+) files? changed(?:, (\d+) insertions?)?(?:, (\d+) deletions?)?/
  );
  if (!match) return { insertions: 0, deletions: 0, filesChanged: 0 };
  return {
    filesChanged: parseInt(match[1], 10) || 0,
    insertions: parseInt(match[2], 10) || 0,
    deletions: parseInt(match[3], 10) || 0,
  };
}
