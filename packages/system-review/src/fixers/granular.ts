/**
 * Granular Fix Action Builder
 * Creates individual fix action closures from a FixPlan for self-heal replay
 */

import type { FixPlan, FixAction, FixResult, ReviewData } from '../types.js';
import { fixEslint } from './eslint.js';
import { fixSecurity } from './security.js';
import { fixMaintenance } from './maintenance.js';
import { fixOrphans, fixUnusedDeps } from './architecture.js';
import { fixTypescriptErrors, fixImportViolations } from './agentic.js';
import { splitOversizedFiles } from './file-split.js';
import { exec } from '../exec.js';

export interface GranularFixAction {
  id: string;
  description: string;
  apply: () => Promise<FixResult>;
}

export function buildGranularActions(
  plan: FixPlan,
  basePath: string,
  reviewData?: ReviewData,
): GranularFixAction[] {
  const mcpPath = `${basePath}/mcp-server`;
  const autoFixes = plan.actions.filter((a) => a.type === 'auto-fix');

  return autoFixes.map((action) => ({
    id: action.id,
    description: action.description,
    apply: () => executeAction(action, basePath, mcpPath, reviewData),
  }));
}

async function executeAction(
  action: FixAction,
  basePath: string,
  mcpPath: string,
  reviewData?: ReviewData,
): Promise<FixResult> {
  if (action.category === 'eslint') return fixEslint(mcpPath);
  if (action.category === 'security') return fixSecurity(mcpPath);
  if (action.category === 'maintenance') return fixMaintenance(basePath);

  if (action.category === 'architecture') {
    if (action.id.includes('orphan') && reviewData) {
      return fixOrphans(basePath, reviewData.architecture.orphanFiles);
    }
    if (action.id.includes('unused-dep') && reviewData) {
      return fixUnusedDeps(mcpPath, reviewData.architecture.unusedDeps);
    }
    if (action.id.includes('file-split') && reviewData) {
      return splitOversizedFiles(basePath, reviewData.architecture.oversizedFiles);
    }
    if (action.id.includes('import') && reviewData) {
      return fixImportViolations(basePath, reviewData);
    }
  }

  if (action.category === 'typescript' && reviewData) {
    return fixTypescriptErrors(basePath, reviewData);
  }

  if (action.command) {
    const result = exec(`cd ${basePath} && ${action.command}`, 120_000);
    return {
      actionId: action.id,
      description: action.description,
      success: result.exitCode === 0,
      output: result.stdout.slice(0, 2000),
    };
  }

  return {
    actionId: action.id,
    description: action.description,
    success: false,
    output: 'No handler or command for this action',
  };
}
