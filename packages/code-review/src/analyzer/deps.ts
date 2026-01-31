/**
 * Dependency Analysis
 */

import { execSync } from 'child_process';
import { generateId } from './utils.js';
import type { Issue, Severity } from '../types.js';

function mapNpmSeverity(npmSeverity: string): Severity {
  switch (npmSeverity) {
    case 'critical': return 'critical';
    case 'high': return 'high';
    case 'moderate': return 'medium';
    case 'low': return 'low';
    default: return 'info';
  }
}

export async function analyzeDependencies(projectPath: string): Promise<Issue[]> {
  const issues: Issue[] = [];

  try {
    const auditResult = execSync('npm audit --json 2>/dev/null || true', {
      cwd: projectPath,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    if (auditResult) {
      try {
        const audit = JSON.parse(auditResult);
        if (audit.vulnerabilities) {
          for (const [name, vuln] of Object.entries(audit.vulnerabilities)) {
            const v = vuln as { severity: string; via: unknown[] };
            issues.push({
              id: generateId(),
              category: 'dependency',
              severity: mapNpmSeverity(v.severity),
              title: `vulnerable-dependency`,
              description: `${name} has ${v.severity} severity vulnerability`,
              suggestion: 'Run npm audit fix or update dependency',
            });
          }
        }
      } catch { /* JSON parse failed */ }
    }
  } catch { /* npm audit failed */ }

  return issues;
}
