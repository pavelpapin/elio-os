/**
 * LLM Analysis — builds prompt from ReviewData, parses FixPlan
 * This is the ONLY file where Claude (LLM) is involved
 */

import type { ReviewData, FixPlan } from './types.js';
import { FixPlanSchema } from './types.js';
import { calculateScore } from './scoring.js';

export function buildAnalysisPrompt(data: ReviewData): string {
  const score = calculateScore(data);

  return `You are a code health analyzer. Analyze this system review data and return a JSON fix plan.

## DATA
${JSON.stringify(data, null, 2)}

## CALCULATED SCORE: ${score}/100

## RULES
1. Return ONLY valid JSON, no markdown, no explanation
2. "auto-fix" for these operations (prefer auto-fix over backlog when possible):
   - category "eslint": if fixableCount > 0 (command: "cd mcp-server && npx eslint --fix src/")
   - category "security": if npmAudit has fixAvailable vulns (command: "cd mcp-server && pnpm audit fix")
   - category "maintenance": if oldLogFiles > 0 or gitGarbageMb > 0 or cacheSizeMb > 200
   - category "architecture" with id containing "orphan": if orphanFiles > 0 (deletes dead code files)
   - category "architecture" with id containing "unused-dep": if unusedDeps > 0 (removes unused packages)
   - category "architecture" with id containing "import": import violations (agent refactors)
   - category "typescript" with id containing "tsc-agent": TypeScript errors (agent reads each file and fixes it). ALWAYS use auto-fix for typescript errors — never backlog them.
   - Any other safe deterministic shell command via the "command" field
   - category "architecture" with id containing "file-split": if oversizedFiles > 0 (agent splits files into ≤200-line modules). ALWAYS use auto-fix for oversized files.
3. "backlog" ONLY for: circular deps, secrets, long functions. Everything else MUST be auto-fix.
4. "skip" for: low-severity items with no action needed
5. Each action needs: id (string), type, category, description, reason
6. For auto-fix: add "command" field (shell command)
7. For backlog: add "priority" field (critical/high/medium/low)
8. Set score to ${score}
9. Set healthAssessment to a 1-sentence summary

## RESPONSE FORMAT
{
  "actions": [...],
  "healthAssessment": "...",
  "score": ${score}
}`;
}

export function parseFixPlan(llmOutput: string, data: ReviewData): FixPlan {
  const cleaned = llmOutput
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const parsed = FixPlanSchema.safeParse(JSON.parse(cleaned));
  if (parsed.success) return parsed.data;

  return buildConservativePlan(data);
}

export function buildConservativePlan(data: ReviewData): FixPlan {
  const actions: FixPlan['actions'] = [];
  let id = 0;

  if (data.eslint.fixableCount > 0) {
    actions.push({
      id: `fix-${++id}`,
      type: 'auto-fix',
      category: 'eslint',
      description: `Fix ${data.eslint.fixableCount} auto-fixable eslint issues`,
      reason: 'eslint --fix is safe and idempotent',
    });
  }

  const fixableVulns = data.security.npmAudit.vulnerabilities.filter(
    (v) => v.fixAvailable,
  );
  if (fixableVulns.length > 0) {
    actions.push({
      id: `fix-${++id}`,
      type: 'auto-fix',
      category: 'security',
      description: `Fix ${fixableVulns.length} vulnerabilities with available patches`,
      reason: 'pnpm audit fix is safe for non-breaking updates',
    });
  }

  if (data.maintenance.oldLogFiles.length > 0 || data.maintenance.gitGarbageMb > 0 || data.maintenance.cacheSizeMb > 200) {
    actions.push({
      id: `fix-${++id}`,
      type: 'auto-fix',
      category: 'maintenance',
      description: 'Clean old logs, git garbage, and cache',
      reason: 'Safe cleanup operations',
    });
  }

  // Agentic: TypeScript errors — Claude fixes files
  if (data.typescript.errorCount > 0) {
    actions.push({
      id: `fix-${++id}-tsc-agent`,
      type: 'auto-fix',
      category: 'typescript',
      description: `Fix ${data.typescript.errorCount} TypeScript errors via agent (top 10 files)`,
      reason: 'Agent reads file + errors, generates fix',
    });
  }

  // Backlog: secrets
  if (data.security.secretsFound.length > 0) {
    actions.push({
      id: `fix-${++id}`,
      type: 'backlog',
      category: 'security',
      description: `${data.security.secretsFound.length} potential secrets found`,
      reason: 'Requires manual verification',
      priority: 'critical',
    });
  }

  // Backlog: architecture issues
  if (data.architecture.circularDeps.length > 0) {
    actions.push({
      id: `fix-${++id}`,
      type: 'backlog',
      category: 'architecture',
      description: `${data.architecture.circularDeps.length} circular dependencies`,
      reason: 'Requires refactoring',
      priority: 'high',
    });
  }

  if (data.architecture.importViolations.length > 0) {
    actions.push({
      id: `fix-${++id}-import-violation`,
      type: 'auto-fix',
      category: 'architecture',
      description: `Fix ${data.architecture.importViolations.length} import violations via agent`,
      reason: 'Agent refactors imports to respect layer boundaries',
    });
  }

  if (data.architecture.orphanFiles.length > 0) {
    actions.push({
      id: `fix-${++id}-orphan`,
      type: 'auto-fix',
      category: 'architecture',
      description: `Delete ${data.architecture.orphanFiles.length} orphan files (dead code)`,
      reason: 'Orphan files are not imported anywhere — safe to remove',
    });
  }

  if (data.architecture.oversizedFiles.length > 0) {
    actions.push({
      id: `fix-${++id}-file-split`,
      type: 'auto-fix',
      category: 'architecture',
      description: `Split ${data.architecture.oversizedFiles.length} oversized files (>200 lines) via agent`,
      reason: 'Agent splits files into ≤200-line modules with barrel re-exports',
    });
  }

  if (data.architecture.unusedDeps.length > 0) {
    actions.push({
      id: `fix-${++id}-unused-dep`,
      type: 'auto-fix',
      category: 'architecture',
      description: `Remove ${data.architecture.unusedDeps.length} unused dependencies`,
      reason: 'Unused deps increase attack surface — safe to remove',
    });
  }

  return {
    actions,
    healthAssessment: 'Conservative plan — LLM analysis unavailable',
    score: calculateScore(data),
  };
}
