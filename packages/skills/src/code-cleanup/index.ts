/**
 * Code Cleanup Skill
 * Cleans up code artifacts and temporary files
 */

import { Skill, CodeCleanupInput, CodeCleanupOutput } from '../types.js';
import { ROOT_DIR, runCommand, remove } from '../runner.js';
import * as path from 'path';
import * as fs from 'fs';

type DirPattern = { dir: string; recursive: boolean };
type FilePattern = { pattern: string; recursive: boolean };

const DIR_PATTERNS: DirPattern[] = [
  { dir: 'node_modules/.cache', recursive: true },
  { dir: '.turbo', recursive: true },
  { dir: 'dist/.tsbuildinfo', recursive: false }
];

const FILE_PATTERNS: FilePattern[] = [
  { pattern: '*.log', recursive: false },
  { pattern: '*.tsbuildinfo', recursive: false }
];

export async function execute(input: CodeCleanupInput): Promise<CodeCleanupOutput> {
  const basePath: string = input.path ?? ROOT_DIR;
  const dryRun = input.dryRun ?? false;
  const cleaned: string[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];

  // Clean specific directories
  for (const item of DIR_PATTERNS) {
    const targetPath = path.join(basePath, item.dir);
    if (fs.existsSync(targetPath)) {
      if (dryRun) {
        skipped.push(`Would remove: ${targetPath}`);
      } else {
        try {
          remove(targetPath, item.recursive);
          cleaned.push(targetPath);
        } catch (e) {
          errors.push(`Failed to remove ${targetPath}: ${e}`);
        }
      }
    }
  }

  // Clean pattern-based files
  for (const item of FILE_PATTERNS) {
    const { stdout } = await runCommand(
      `find "${basePath}" -name "${item.pattern}" -type f 2>/dev/null || true`
    );
    const files = stdout.trim().split('\n').filter(Boolean);

    for (const file of files) {
      if (dryRun) {
        skipped.push(`Would remove: ${file}`);
      } else {
        try {
          remove(file);
          cleaned.push(file);
        } catch (e) {
          errors.push(`Failed to remove ${file}: ${e}`);
        }
      }
    }
  }

  // Clean pnpm cache
  if (!dryRun) {
    const { exitCode, stderr } = await runCommand('pnpm store prune', { cwd: basePath });
    if (exitCode === 0) {
      cleaned.push('pnpm store pruned');
    } else if (stderr) {
      errors.push(`pnpm store prune: ${stderr}`);
    }
  } else {
    skipped.push('Would prune pnpm store');
  }

  return { cleaned, errors, skipped };
}

export const codeCleanup: Skill<CodeCleanupInput, CodeCleanupOutput> = {
  metadata: {
    name: 'code-cleanup',
    version: '1.0.0',
    description: 'Clean up code artifacts and temporary files',
    inputs: {
      path: {
        type: 'string',
        required: false,
        default: ROOT_DIR,
        description: 'Base path to clean'
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
        description: 'Cleanup results'
      }
    },
    tags: ['cleanup', 'maintenance'],
    timeout: 120
  },
  execute
};

export { codeCleanup };
