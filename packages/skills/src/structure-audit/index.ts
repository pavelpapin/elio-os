/**
 * Structure Audit Skill
 * Validates codebase structure and organization
 */

import { Skill } from '../types.js';
import { ROOT_DIR, runCommand, fileExists, listDirectories, readJsonFile } from '../runner.js';
import * as path from 'path';
import * as fs from 'fs';

export interface StructureAuditInput {
  verbose?: boolean;
}

export interface StructureIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  path?: string;
}

export interface StructureAuditOutput {
  valid: boolean;
  issues: StructureIssue[];
  structure: {
    packages: string[];
    adapters: string[];
    skills: string[];
    workflows: string[];
  };
  stats: {
    total_files: number;
    total_lines: number;
    typescript_files: number;
  };
}

export async function execute(input: StructureAuditInput): Promise<StructureAuditOutput> {
  // verbose parameter reserved for future detailed output
  void input.verbose;
  const issues: StructureIssue[] = [];

  // Validate required directories
  const requiredDirs = ['packages', 'mcp-server', 'skills', 'workflows', 'scripts', 'secrets'];
  for (const dir of requiredDirs) {
    const dirPath = path.join(ROOT_DIR, dir);
    if (!fileExists(dirPath)) {
      issues.push({
        severity: 'error',
        category: 'structure',
        message: `Missing required directory: ${dir}`,
        path: dirPath
      });
    }
  }

  // Validate required files
  const requiredFiles = ['package.json', 'tsconfig.base.json', 'CLAUDE.md'];
  for (const file of requiredFiles) {
    const filePath = path.join(ROOT_DIR, file);
    if (!fileExists(filePath)) {
      issues.push({
        severity: 'error',
        category: 'structure',
        message: `Missing required file: ${file}`,
        path: filePath
      });
    }
  }

  // Collect structure info
  const packages = listDirectories(path.join(ROOT_DIR, 'packages'));
  const adapters = listDirectories(path.join(ROOT_DIR, 'mcp-server/src/adapters'));
  const skills = listDirectories(path.join(ROOT_DIR, 'skills')).filter(s => s !== '_template');
  const workflows = fileExists(path.join(ROOT_DIR, 'workflows'))
    ? listDirectories(path.join(ROOT_DIR, 'workflows')).filter(w => w !== '_template')
    : [];

  // Validate packages
  for (const pkg of packages) {
    const pkgPath = path.join(ROOT_DIR, 'packages', pkg);
    const pkgJsonPath = path.join(pkgPath, 'package.json');
    const srcPath = path.join(pkgPath, 'src');
    const indexPath = path.join(srcPath, 'index.ts');

    if (!fileExists(pkgJsonPath)) {
      issues.push({
        severity: 'error',
        category: 'package',
        message: `Package ${pkg} missing package.json`,
        path: pkgPath
      });
    } else {
      const pkgJson = readJsonFile<{ name?: string; exports?: Record<string, string> }>(pkgJsonPath);
      if (pkgJson && !pkgJson.name?.startsWith('@elio/')) {
        issues.push({
          severity: 'warning',
          category: 'naming',
          message: `Package ${pkg} should use @elio/ namespace`,
          path: pkgJsonPath
        });
      }
    }

    if (!fileExists(indexPath)) {
      issues.push({
        severity: 'warning',
        category: 'package',
        message: `Package ${pkg} missing src/index.ts entry point`,
        path: srcPath
      });
    }
  }

  // Validate adapters have matching exports
  const adaptersIndexPath = path.join(ROOT_DIR, 'mcp-server/src/adapters/index.ts');
  if (fileExists(adaptersIndexPath)) {
    const indexContent = fs.readFileSync(adaptersIndexPath, 'utf-8');
    for (const adapter of adapters) {
      if (!indexContent.includes(`from './${adapter}'`) && !indexContent.includes(`from "./${adapter}"`)) {
        issues.push({
          severity: 'warning',
          category: 'adapter',
          message: `Adapter ${adapter} not exported from adapters/index.ts`,
          path: adaptersIndexPath
        });
      }
    }
  }

  // Get stats
  const { stdout: fileCount } = await runCommand(
    `find "${ROOT_DIR}/packages" "${ROOT_DIR}/mcp-server/src" -name "*.ts" -type f | wc -l`
  );

  const { stdout: lineCount } = await runCommand(
    `find "${ROOT_DIR}/packages" "${ROOT_DIR}/mcp-server/src" -name "*.ts" -type f -exec cat {} \\; | wc -l`
  );

  const totalFiles = parseInt(fileCount.trim(), 10) || 0;
  const totalLines = parseInt(lineCount.trim(), 10) || 0;

  // Check for orphaned files
  const { stdout: orphanedJs } = await runCommand(
    `find "${ROOT_DIR}/packages" "${ROOT_DIR}/mcp-server/src" -name "*.js" -type f ! -path "*/dist/*" ! -path "*/node_modules/*" | head -5`
  );

  if (orphanedJs.trim()) {
    issues.push({
      severity: 'warning',
      category: 'cleanup',
      message: 'Found .js files outside dist/ - should be TypeScript only',
      path: orphanedJs.trim().split('\n')[0]
    });
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    structure: {
      packages,
      adapters,
      skills,
      workflows
    },
    stats: {
      total_files: totalFiles,
      total_lines: totalLines,
      typescript_files: totalFiles
    }
  };
}

export const structureAudit: Skill<StructureAuditInput, StructureAuditOutput> = {
  metadata: {
    name: 'structure-audit',
    version: '1.0.0',
    description: 'Validate codebase structure',
    inputs: {
      verbose: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Include detailed output'
      }
    },
    outputs: {
      result: {
        type: 'object',
        description: 'Structure audit results'
      }
    },
    tags: ['audit', 'structure', 'validation'],
    timeout: 120
  },
  execute
};

export { structureAudit };
