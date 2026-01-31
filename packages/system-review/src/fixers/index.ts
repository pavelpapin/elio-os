/**
 * Fix orchestrator
 * Applies fix plan actions — deterministic first, then agentic (LLM)
 */

import type { FixPlan, FixResult, FixAction, ReviewData } from '../types.js';
import { exec } from '../exec.js';
import { fixEslint } from './eslint.js';
import { fixSecurity } from './security.js';
import { fixMaintenance } from './maintenance.js';
import { fixOrphans, fixUnusedDeps } from './architecture.js';
import { fixTypescriptErrors, fixImportViolations } from './agentic.js';
export async function applyFixes(
  plan: FixPlan,
  basePath: string,
  reviewData?: ReviewData,
): Promise<FixResult[]> {
  // Skip file-split actions — handled by dedicated split-files stage
  const autoFixes = plan.actions.filter((a) => a.type === 'auto-fix' && !a.id.includes('file-split'));
  const results: FixResult[] = [];
  const mcp = `${basePath}/mcp-server`;

  for (const action of autoFixes) {
    const result = await executeAction(action, basePath, mcp, reviewData);
    results.push(result);
  }

  return results;
}

async function executeAction(
  action: FixAction,
  basePath: string,
  mcpPath: string,
  reviewData?: ReviewData,
): Promise<FixResult> {
  // Deterministic fixers
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
    if (action.id.includes('import') && reviewData) {
      return fixImportViolations(basePath, reviewData);
    }
  }

  // Agentic fixers (Claude API)
  if (action.category === 'typescript' && reviewData) {
    return fixTypescriptErrors(basePath, reviewData);
  }

  // LLM-provided command — execute directly
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
