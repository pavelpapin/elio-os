/**
 * Report generator — Markdown from pipeline results
 * Notion/Telegram delivery is handled by execute.ts via BullMQ worker
 */

import type { ReviewData, FixPlan, FixResult, VerifyResult } from './types.js';
import { calculateScore, getHealthLevel } from './scoring.js';
import type { SelfHealResult } from './self-heal.js';

interface ReportInput {
  data: ReviewData;
  plan: FixPlan;
  fixResults: FixResult[];
  verification: VerifyResult;
  rolledBack: boolean;
  commitOutput: string;
  selfHealResult?: SelfHealResult;
}

export function generateMarkdownReport(input: ReportInput): string {
  const { data, plan, fixResults, verification, rolledBack } = input;
  const score = plan.score;
  const level = getHealthLevel(score);
  const date = data.timestamp.split('T')[0];
  const emoji = { excellent: '🟢', good: '🟡', warning: '🟠', poor: '🔴', critical: '⛔' }[level];

  const autoFixes = plan.actions.filter((a) => a.type === 'auto-fix');
  const backlogs = plan.actions.filter((a) => a.type === 'backlog');
  const skipped = plan.actions.filter((a) => a.type === 'skip');

  const lines: string[] = [];
  lines.push(`# System Review — ${date}`);
  lines.push(`## Health Score: ${score}/100 ${emoji}\n`);
  lines.push(`**Assessment:** ${plan.healthAssessment}\n`);

  // Data Collection Summary
  lines.push(`## Data Collection\n`);
  lines.push(`| Check | Result |`);
  lines.push(`|-------|--------|`);
  lines.push(`| Git (24h) | ${data.git.commitCount24h} commits, ${data.git.filesChanged.length} files |`);
  lines.push(`| TypeScript | ${data.typescript.errorCount} errors |`);
  lines.push(`| ESLint | ${data.eslint.errorCount} errors, ${data.eslint.warningCount} warnings (${data.eslint.fixableCount} fixable) |`);
  lines.push(`| Architecture | ${data.architecture.oversizedFiles.length} oversized, ${data.architecture.longFunctions.length} long fns, ${data.architecture.circularDeps.length} cycles, ${data.architecture.orphanFiles.length} orphans, ${data.architecture.importViolations.length} violations, ${data.architecture.unusedDeps.length} unused deps |`);
  lines.push(`| Security | ${data.security.npmAudit.total} vulns (${data.security.npmAudit.critical} critical), ${data.security.secretsFound.length} secrets |`);
  lines.push(`| Infra | Disk ${data.infra.diskUsagePercent}%, RAM ${data.infra.ramUsagePercent}%, ${data.infra.failedServices.length} failed services |`);
  lines.push(`| Maintenance | ${data.maintenance.oldLogFiles.length} old logs, ${data.maintenance.cacheSizeMb}MB cache |`);

  // Architecture Deep Dive
  const arch = data.architecture;
  const hasArchIssues =
    arch.circularDeps.length > 0 ||
    arch.importViolations.length > 0 ||
    arch.orphanFiles.length > 0 ||
    arch.unusedDeps.length > 0 ||
    arch.unusedExports > 0;

  if (hasArchIssues) {
    lines.push(`\n## Architecture Deep Dive\n`);

    if (arch.circularDeps.length > 0) {
      lines.push(`### Circular Dependencies (${arch.circularDeps.length})\n`);
      for (const dep of arch.circularDeps) {
        lines.push(`- ${dep.cycle.join(' → ')}`);
      }
      lines.push('');
    }

    if (arch.importViolations.length > 0) {
      lines.push(`### Import Violations (${arch.importViolations.length})\n`);
      for (const v of arch.importViolations) {
        lines.push(`- **${v.file}** imports \`${v.imports}\` — ${v.rule}`);
      }
      lines.push('');
    }

    if (arch.orphanFiles.length > 0) {
      lines.push(`### Orphan Files (${arch.orphanFiles.length})\n`);
      for (const f of arch.orphanFiles) {
        lines.push(`- ${f}`);
      }
      lines.push('');
    }

    if (arch.unusedDeps.length > 0) {
      lines.push(`### Unused Dependencies (${arch.unusedDeps.length})\n`);
      lines.push(arch.unusedDeps.map((d) => `\`${d}\``).join(', ') + '\n');
    }

    if (arch.unusedExports > 0) {
      lines.push(`### Unused Exports\n`);
      lines.push(`~${arch.unusedExports} exports not imported anywhere\n`);
    }
  }

  // Fixes Applied
  lines.push(`\n## Fixes Applied (${fixResults.length})\n`);
  if (fixResults.length === 0) {
    lines.push('No auto-fixes applied.\n');
  } else {
    for (const fix of fixResults) {
      const icon = fix.success ? '✅' : '❌';
      lines.push(`### ${icon} ${fix.description}`);
      lines.push(`\`\`\`\n${fix.output.slice(0, 500)}\n\`\`\`\n`);
    }
  }

  // Verification
  lines.push(`## Verification\n`);
  lines.push(`| Check | Status |`);
  lines.push(`|-------|--------|`);
  lines.push(`| Build | ${verification.buildPassed ? '✅ PASS' : '❌ FAIL'} |`);
  lines.push(`| Tests | ${verification.testsPassed ? '✅ PASS' : '❌ FAIL'} |`);
  lines.push(`| Rolled Back | ${rolledBack ? '⚠️ YES' : '✅ No'} |`);
  lines.push(`| Diff | +${verification.diffStats.insertions} -${verification.diffStats.deletions} (${verification.diffStats.files} files) |`);

  // Self-Heal Results
  const healResult = input.selfHealResult;
  if (healResult) {
    lines.push(`\n## Self-Heal Report\n`);
    lines.push(`Self-healing was triggered because the initial build failed after applying fixes.\n`);
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Fixes survived | ${healResult.appliedFixes.length} |`);
    lines.push(`| Fixes rolled back | ${healResult.rolledBackFixes.length} |`);
    lines.push(`| LLM heal iterations | ${healResult.healIterations.length} |`);
    lines.push(`| Final build | ${healResult.buildPassed ? '✅ PASS' : '❌ FAIL'} |`);
    lines.push(`| Final tests | ${healResult.testsPassed ? '✅ PASS' : '❌ FAIL'} |`);

    if (healResult.rolledBackFixes.length > 0) {
      lines.push(`\n### Rolled Back Fixes\n`);
      for (const fix of healResult.rolledBackFixes) {
        lines.push(`- ❌ **${fix.description}** — ${fix.output.slice(0, 200)}`);
      }
    }

    if (healResult.healIterations.length > 0) {
      lines.push(`\n### Heal Iterations\n`);
      for (const iter of healResult.healIterations) {
        const icon = iter.buildPassed ? '✅' : '🔄';
        lines.push(`#### ${icon} Iteration ${iter.iteration}\n`);
        lines.push(`- Errors found: ${iter.errorsFound}`);
        lines.push(`- Files fixed: ${iter.filesFixed}`);
        lines.push(`- Build: ${iter.buildPassed ? 'PASS' : 'FAIL'}`);
        if (iter.errors.length > 0) {
          lines.push(`- Details: ${iter.errors.slice(0, 5).join('; ')}`);
        }
        lines.push('');
      }
    }
  }

  // Backlog
  if (backlogs.length > 0) {
    lines.push(`\n## Backlog Items (${backlogs.length})\n`);
    for (const item of backlogs) {
      lines.push(`- **[${item.priority ?? 'medium'}]** ${item.description} — ${item.reason}`);
    }
  }

  // Skipped
  if (skipped.length > 0) {
    lines.push(`\n## Skipped (${skipped.length})\n`);
    for (const item of skipped) {
      lines.push(`- ${item.description} — ${item.reason}`);
    }
  }

  // Summary
  lines.push(`\n## Summary\n`);
  lines.push(`- Issues analyzed: ${plan.actions.length}`);
  lines.push(`- Auto-fixed: ${autoFixes.length}`);
  lines.push(`- Backlog: ${backlogs.length}`);
  lines.push(`- Skipped: ${skipped.length}`);
  lines.push(`- Build: ${verification.buildPassed ? 'PASS' : 'FAIL'}`);
  lines.push(`- Tests: ${verification.testsPassed ? 'PASS' : 'FAIL'}`);

  return lines.join('\n');
}

export function generateTelegramSummary(input: ReportInput): string {
  const { plan, fixResults, verification, rolledBack } = input;
  const auto = plan.actions.filter((a) => a.type === 'auto-fix').length;
  const backlog = plan.actions.filter((a) => a.type === 'backlog').length;
  const successFixes = fixResults.filter((f) => f.success).length;

  let msg = `<b>System Review Complete</b>\n`;
  msg += `Score: ${plan.score}/100\n`;
  msg += `Fixed: ${successFixes}/${auto} | Backlog: ${backlog}\n`;
  msg += `Build: ${verification.buildPassed ? 'PASS' : 'FAIL'}`;
  msg += ` | Tests: ${verification.testsPassed ? 'PASS' : 'FAIL'}`;
  if (input.selfHealResult) {
    const sh = input.selfHealResult;
    msg += `\n🔧 Self-heal: ${sh.appliedFixes.length} kept, ${sh.rolledBackFixes.length} reverted`;
    if (sh.healIterations.length > 0) {
      msg += `, ${sh.healIterations.length} LLM iterations`;
    }
  } else if (rolledBack) {
    msg += `\n⚠️ Changes rolled back`;
  }

  return msg;
}
