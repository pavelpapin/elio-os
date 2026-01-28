/**
 * Maintenance Adapter
 * Exposes maintenance capabilities as MCP tools
 */

import { z } from 'zod';
import { Adapter, AdapterTool } from '../../gateway/types.js';
import {
  runMaintenance,
  runSmokeTest,
  cleanLogs,
  runDependencyMaintenance,
  runGitMaintenance,
  formatAsMarkdown,
} from '@elio/maintenance';
import { executeAutoTest } from '@elio/skills';
import { join } from 'path';
import {
  maintenanceSchema,
  smokeTestSchema,
  cleanupSchema,
  depsSchema,
  gitSchema,
  autoTestSchema,
} from './schemas.js';

const PROJECT_DIR = '/root/.claude';

const tools: AdapterTool[] = [
  {
    name: 'run',
    description: 'Run full maintenance - smoke test, cleanup, dependency audit, git maintenance',
    type: 'write',
    schema: maintenanceSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof maintenanceSchema>;
      const result = await runMaintenance(PROJECT_DIR, {
        smokeTest: p.smokeTest, cleanLogs: p.cleanLogs, cleanCache: p.cleanCache,
        cleanTemp: p.cleanTemp, updateDeps: p.updateDeps, gitMaintenance: p.gitMaintenance, dryRun: p.dryRun,
      });
      if (p.output === 'json') return JSON.stringify(result, null, 2);
      return formatAsMarkdown(result);
    },
  },
  {
    name: 'smoke_test',
    description: 'Run smoke test - verify all integrations, skills, workflows, and build health',
    type: 'read',
    schema: smokeTestSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof smokeTestSchema>;
      const result = runSmokeTest(PROJECT_DIR, p.autoFix ?? true);
      if (p.output === 'markdown') {
        const lines: string[] = [
          `# Smoke Test Report\n`, `**Overall:** ${result.overall.toUpperCase()}`,
          `**Build:** ${result.buildStatus}\n`, `## Skills`,
          `- Passed: ${result.skills.passed}`, `- Failed: ${result.skills.failed}`,
          `- Fixed: ${result.skills.fixed}\n`, `## Workflows`,
          `- Passed: ${result.workflows.passed}`, `- Failed: ${result.workflows.failed}\n`,
          `## Integrations`,
        ];
        for (const [name, data] of Object.entries(result.integrations)) {
          const status = data.status === 'ok' ? '✅' : '❌';
          const latency = data.latency_ms ? ` (${data.latency_ms}ms)` : '';
          lines.push(`- ${status} ${name}${latency}`);
        }
        if (result.fixesApplied.length > 0) {
          lines.push(`\n## Fixes Applied`);
          for (const fix of result.fixesApplied) lines.push(`- ${fix}`);
        }
        return lines.join('\n');
      }
      return JSON.stringify(result, null, 2);
    },
  },
  {
    name: 'cleanup',
    description: 'Clean old logs, cache, and temp files',
    type: 'write',
    schema: cleanupSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof cleanupSchema>;
      const retention = p.logsRetentionDays ?? 7;
      const dryRun = p.dryRun ?? false;
      const logsDeleted = cleanLogs(join(PROJECT_DIR, 'logs'), retention, dryRun);
      return JSON.stringify({ logsDeleted, dryRun, message: dryRun ? `Would delete ${logsDeleted} log files older than ${retention} days` : `Deleted ${logsDeleted} log files older than ${retention} days` }, null, 2);
    },
  },
  {
    name: 'deps_audit',
    description: 'Audit dependencies for vulnerabilities and outdated packages',
    type: 'read',
    schema: depsSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof depsSchema>;
      const result = runDependencyMaintenance(PROJECT_DIR, p.update ?? false, false);
      const lines: string[] = ['# Dependency Audit\n', `- Vulnerabilities: ${result.vulnerabilities}`, `- Outdated packages: ${result.outdated}`, `- Updated: ${result.updated}`];
      if (result.vulnerabilities > 0) lines.push('\n**Action needed:** Run `pnpm audit fix` to resolve vulnerabilities');
      return lines.join('\n');
    },
  },
  {
    name: 'git_clean',
    description: 'Clean git - delete merged branches, prune remotes, run gc',
    type: 'write',
    schema: gitSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof gitSchema>;
      const dryRun = p.dryRun ?? false;
      const result = runGitMaintenance(PROJECT_DIR, dryRun);
      return JSON.stringify({ branchesDeleted: result.branchesDeleted, gcRun: result.gcRun, prunedRemotes: result.prunedRemotes, dryRun }, null, 2);
    },
  },
  {
    name: 'auto_test',
    description: 'Run automated tests for core modules',
    type: 'read',
    schema: autoTestSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof autoTestSchema>;
      const result = await executeAutoTest({ scope: p.scope ?? 'changed' });
      const lines: string[] = [
        '# Auto Test Results\n', `**Scope:** ${result.scope}`,
        `**Status:** ${result.passed ? '✅ PASSED' : '❌ FAILED'}`,
        `**Pass Rate:** ${result.summary.pass_rate}%\n`, '## Summary',
        `- Total: ${result.summary.total}`, `- Passed: ${result.summary.passed}`,
        `- Failed: ${result.summary.failed}`, `- Skipped: ${result.summary.skipped}`,
      ];
      if (result.failures.length > 0) {
        lines.push('\n## Failures');
        for (const failure of result.failures) lines.push(`- ${failure}`);
      }
      return lines.join('\n');
    },
  },
];

export const maintenanceAdapter: Adapter = { name: 'maintenance', isAuthenticated: () => true, tools };
export default maintenanceAdapter;
