/**
 * Git Maintenance Skill
 * Performs git repository maintenance tasks
 */

import { Skill, GitMaintenanceInput, GitMaintenanceOutput } from '../types.js';
import { ROOT_DIR, runCommand } from '../runner.js';

export async function execute(input: GitMaintenanceInput): Promise<GitMaintenanceOutput> {
  const repo = input.repo || ROOT_DIR;
  const dryRun = input.dryRun ?? false;
  const prunedBranches: string[] = [];
  const errors: string[] = [];
  let gcResult = '';

  // Get list of merged branches
  const { stdout: mergedBranches } = await runCommand(
    'git branch --merged main 2>/dev/null | grep -v "main" | grep -v "\\*" || true',
    { cwd: repo }
  );

  const branches = mergedBranches.trim().split('\n').filter(Boolean).map(b => b.trim());

  // Delete merged branches
  for (const branch of branches) {
    if (dryRun) {
      prunedBranches.push(`[DRY] Would delete: ${branch}`);
    } else {
      const { exitCode } = await runCommand(`git branch -d "${branch}"`, { cwd: repo });
      if (exitCode === 0) {
        prunedBranches.push(branch);
      } else {
        errors.push(`Failed to delete branch: ${branch}`);
      }
    }
  }

  // Prune remote tracking branches
  if (!dryRun) {
    const { exitCode, stderr } = await runCommand('git remote prune origin 2>&1', { cwd: repo });
    if (exitCode !== 0 && stderr) {
      errors.push(`Remote prune: ${stderr}`);
    }
  }

  // Run garbage collection
  if (!dryRun) {
    const { stdout, exitCode, stderr } = await runCommand('git gc --auto 2>&1', { cwd: repo });
    if (exitCode === 0) {
      gcResult = stdout.trim() || 'Completed successfully';
    } else {
      gcResult = 'Failed';
      errors.push(`Git gc: ${stderr}`);
    }
  } else {
    gcResult = '[DRY] Would run git gc --auto';
  }

  // Clean up stale worktrees
  if (!dryRun) {
    await runCommand('git worktree prune 2>/dev/null || true', { cwd: repo });
  }

  return {
    pruned_branches: prunedBranches,
    gc_result: gcResult,
    errors
  };
}

export const gitMaintenance: Skill<GitMaintenanceInput, GitMaintenanceOutput> = {
  metadata: {
    name: 'git-maintenance',
    version: '1.0.0',
    description: 'Git repository maintenance',
    inputs: {
      repo: {
        type: 'string',
        required: false,
        default: ROOT_DIR,
        description: 'Repository path'
      },
      dryRun: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Preview changes without executing'
      }
    },
    outputs: {
      result: {
        type: 'object',
        description: 'Maintenance results'
      }
    },
    tags: ['git', 'maintenance', 'cleanup'],
    timeout: 120
  },
  execute
};

export { gitMaintenance };
