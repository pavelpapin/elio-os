/**
 * Elio Skills Package
 * Executable skills for automation tasks
 */

// Types
export * from './types.js';

// Utilities
export * from './runner.js';

// Skills
export { autoTest, execute as executeAutoTest } from './auto-test/index.js';
export { smokeTest, execute as executeSmokeTest } from './smoke-test/index.js';
export { webSearch, execute as executeWebSearch } from './web-search/index.js';
export { codeCleanup, execute as executeCodeCleanup } from './code-cleanup/index.js';
export { diskCleanup, execute as executeDiskCleanup } from './disk-cleanup/index.js';
export { gitMaintenance, execute as executeGitMaintenance } from './git-maintenance/index.js';
export { depMaintenance, execute as executeDepMaintenance } from './dep-maintenance/index.js';
export { brutalAudit, execute as executeBrutalAudit } from './brutal-audit/index.js';
export { docsAudit, execute as executeDocsAudit } from './docs-audit/index.js';
export { structureAudit, execute as executeStructureAudit } from './structure-audit/index.js';

// Skill registry
import { autoTest } from './auto-test/index.js';
import { smokeTest } from './smoke-test/index.js';
import { webSearch } from './web-search/index.js';
import { codeCleanup } from './code-cleanup/index.js';
import { diskCleanup } from './disk-cleanup/index.js';
import { gitMaintenance } from './git-maintenance/index.js';
import { depMaintenance } from './dep-maintenance/index.js';
import { brutalAudit } from './brutal-audit/index.js';
import { docsAudit } from './docs-audit/index.js';
import { structureAudit } from './structure-audit/index.js';
import type { AnySkill } from './types.js';

// Individual skills have strict types via their exports; registry uses AnySkill
export const skills: Record<string, AnySkill> = {
  'auto-test': autoTest,
  'smoke-test': smokeTest,
  'web-search': webSearch,
  'code-cleanup': codeCleanup,
  'disk-cleanup': diskCleanup,
  'git-maintenance': gitMaintenance,
  'dep-maintenance': depMaintenance,
  'brutal-audit': brutalAudit,
  'docs-audit': docsAudit,
  'structure-audit': structureAudit
};

/**
 * Execute a skill by name
 */
export async function executeSkill(name: string, input: Record<string, unknown> = {}): Promise<unknown> {
  const skill = skills[name];
  if (!skill) {
    throw new Error(`Unknown skill: ${name}. Available: ${Object.keys(skills).join(', ')}`);
  }
  return skill.execute(input);
}

/**
 * List available skills
 */
export function listSkills(): Array<{ name: string; description: string; tags: string[] }> {
  return Object.entries(skills).map(([name, skill]) => ({
    name,
    description: skill.metadata.description,
    tags: skill.metadata.tags
  }));
}
