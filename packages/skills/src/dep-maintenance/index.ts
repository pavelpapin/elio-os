/**
 * Dependency Maintenance Skill
 * Checks and updates package dependencies
 */

import { Skill, DepMaintenanceInput, DepMaintenanceOutput } from '../types.js';
import { ROOT_DIR, runCommand } from '../runner.js';

interface OutdatedPackage {
  name: string;
  current: string;
  wanted: string;
  latest: string;
}

export async function execute(input: DepMaintenanceInput): Promise<DepMaintenanceOutput> {
  const checkOnly = input.check ?? true;
  const shouldUpdate = input.update ?? false;
  const outdated: OutdatedPackage[] = [];
  const updated: string[] = [];
  const errors: string[] = [];

  // Check for outdated packages
  const { stdout } = await runCommand('pnpm outdated --format json 2>/dev/null || echo "[]"', {
    cwd: ROOT_DIR
  });

  try {
    const parsed = JSON.parse(stdout || '[]');
    if (Array.isArray(parsed)) {
      for (const pkg of parsed) {
        outdated.push({
          name: pkg.name || pkg.package || 'unknown',
          current: pkg.current || 'unknown',
          wanted: pkg.wanted || pkg.current || 'unknown',
          latest: pkg.latest || 'unknown'
        });
      }
    } else if (typeof parsed === 'object') {
      // pnpm outdated returns object format
      for (const [name, info] of Object.entries(parsed)) {
        const pkgInfo = info as { current?: string; wanted?: string; latest?: string };
        outdated.push({
          name,
          current: pkgInfo.current || 'unknown',
          wanted: pkgInfo.wanted || 'unknown',
          latest: pkgInfo.latest || 'unknown'
        });
      }
    }
  } catch (e) {
    // Try line-by-line parsing
    const lines = stdout.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/);
      if (match) {
        outdated.push({
          name: match[1],
          current: match[2],
          wanted: match[3],
          latest: match[4]
        });
      }
    }
  }

  // Update if requested
  if (shouldUpdate && !checkOnly) {
    for (const pkg of outdated) {
      const { exitCode: updateCode, stderr } = await runCommand(
        `pnpm update ${pkg.name}`,
        { cwd: ROOT_DIR }
      );

      if (updateCode === 0) {
        updated.push(`${pkg.name}: ${pkg.current} -> ${pkg.wanted}`);
      } else {
        errors.push(`Failed to update ${pkg.name}: ${stderr}`);
      }
    }
  }

  // Check for security vulnerabilities
  const { stdout: auditOutput } = await runCommand(
    'pnpm audit --json 2>/dev/null || echo "{}"',
    { cwd: ROOT_DIR }
  );

  try {
    const audit = JSON.parse(auditOutput || '{}');
    if (audit.metadata?.vulnerabilities) {
      const vuln = audit.metadata.vulnerabilities;
      const total = (vuln.critical || 0) + (vuln.high || 0) + (vuln.moderate || 0) + (vuln.low || 0);
      if (total > 0) {
        errors.push(`Security vulnerabilities found: ${vuln.critical || 0} critical, ${vuln.high || 0} high, ${vuln.moderate || 0} moderate`);
      }
    }
  } catch {
    // Audit parsing failed, not critical
  }

  return { outdated, updated, errors };
}

export const depMaintenance: Skill<DepMaintenanceInput, DepMaintenanceOutput> = {
  metadata: {
    name: 'dep-maintenance',
    version: '1.0.0',
    description: 'Check and update dependencies',
    inputs: {
      check: {
        type: 'boolean',
        required: false,
        default: true,
        description: 'Check for outdated packages'
      },
      update: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Update outdated packages'
      }
    },
    outputs: {
      result: {
        type: 'object',
        description: 'Dependency status'
      }
    },
    tags: ['dependencies', 'maintenance', 'security'],
    timeout: 300
  },
  execute
};

export { depMaintenance };
