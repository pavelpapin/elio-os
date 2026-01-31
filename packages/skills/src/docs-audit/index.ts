/**
 * Docs Audit Skill
 * Audits documentation completeness and accuracy
 */

import { Skill } from '../types.js';
import { ROOT_DIR, fileExists, listDirectories } from '../runner.js';
import * as path from 'path';
import * as fs from 'fs';

export interface DocsAuditInput {
  fix?: boolean;
}

export interface DocIssue {
  type: 'missing' | 'outdated' | 'incomplete';
  path: string;
  description: string;
}

export interface DocsAuditOutput {
  issues: DocIssue[];
  coverage: {
    packages: { total: number; documented: number };
    skills: { total: number; documented: number };
    workflows: { total: number; documented: number };
    adapters: { total: number; documented: number };
  };
  fixes_applied: string[];
}

export async function execute(input: DocsAuditInput): Promise<DocsAuditOutput> {
  const shouldFix = input.fix ?? false;
  const issues: DocIssue[] = [];
  const fixes: string[] = [];

  // Check packages documentation
  const packagesDir = path.join(ROOT_DIR, 'packages');
  const packages = listDirectories(packagesDir);
  let packagesDocumented = 0;

  for (const pkg of packages) {
    const readmePath = path.join(packagesDir, pkg, 'README.md');
    if (fileExists(readmePath)) {
      packagesDocumented++;

      // Check if README is too short
      const content = fs.readFileSync(readmePath, 'utf-8');
      if (content.length < 200) {
        issues.push({
          type: 'incomplete',
          path: readmePath,
          description: `README for ${pkg} is too short`
        });
      }
    } else {
      issues.push({
        type: 'missing',
        path: readmePath,
        description: `Missing README for package ${pkg}`
      });

      if (shouldFix) {
        const readme = `# @elio/${pkg}\n\nTODO: Add description.\n\n## Installation\n\n\`\`\`bash\npnpm add @elio/${pkg}\n\`\`\`\n\n## Usage\n\n\`\`\`typescript\nimport { } from '@elio/${pkg}';\n\`\`\`\n`;
        fs.writeFileSync(readmePath, readme);
        fixes.push(`Created README.md for ${pkg}`);
        packagesDocumented++;
      }
    }
  }

  // Check skills documentation
  const skillsDir = path.join(ROOT_DIR, 'skills');
  const skills = listDirectories(skillsDir).filter(s => s !== '_template');
  let skillsDocumented = 0;

  for (const skill of skills) {
    const skillMdPath = path.join(skillsDir, skill, 'SKILL.md');
    if (fileExists(skillMdPath)) {
      skillsDocumented++;
    } else {
      issues.push({
        type: 'missing',
        path: skillMdPath,
        description: `Missing SKILL.md for ${skill}`
      });

      if (shouldFix) {
        const skillMd = `# ${skill} Skill\n\nTODO: Add description.\n\n## Usage\n\n\`\`\`bash\n./run.sh\n\`\`\`\n`;
        fs.writeFileSync(skillMdPath, skillMd);
        fixes.push(`Created SKILL.md for ${skill}`);
        skillsDocumented++;
      }
    }
  }

  // Check workflows documentation
  const workflowsDir = path.join(ROOT_DIR, 'workflows');
  let workflows: string[] = [];
  let workflowsDocumented = 0;

  if (fileExists(workflowsDir)) {
    workflows = listDirectories(workflowsDir).filter(w => w !== '_template');

    for (const wf of workflows) {
      const wfMdPath = path.join(workflowsDir, wf, 'WORKFLOW.md');
      if (fileExists(wfMdPath)) {
        workflowsDocumented++;
      } else {
        issues.push({
          type: 'missing',
          path: wfMdPath,
          description: `Missing WORKFLOW.md for ${wf}`
        });

        if (shouldFix) {
          const wfMd = `# ${wf} Workflow\n\nTODO: Add description.\n\n## Steps\n\n1. Step one\n`;
          fs.writeFileSync(wfMdPath, wfMd);
          fixes.push(`Created WORKFLOW.md for ${wf}`);
          workflowsDocumented++;
        }
      }
    }
  }

  // Check adapters documentation (inline comments count)
  const adaptersDir = path.join(ROOT_DIR, 'mcp-server/src/adapters');
  const adapters = listDirectories(adaptersDir);
  let adaptersDocumented = 0;

  for (const adapter of adapters) {
    const indexPath = path.join(adaptersDir, adapter, 'index.ts');
    if (fileExists(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf-8');
      // Check for JSDoc or descriptive comments
      if (content.includes('/**') || content.includes('description:')) {
        adaptersDocumented++;
      } else {
        issues.push({
          type: 'incomplete',
          path: indexPath,
          description: `Adapter ${adapter} lacks documentation`
        });
      }
    }
  }

  return {
    issues,
    coverage: {
      packages: { total: packages.length, documented: packagesDocumented },
      skills: { total: skills.length, documented: skillsDocumented },
      workflows: { total: workflows.length, documented: workflowsDocumented },
      adapters: { total: adapters.length, documented: adaptersDocumented }
    },
    fixes_applied: fixes
  };
}

export const docsAudit: Skill<DocsAuditInput, DocsAuditOutput> = {
  metadata: {
    name: 'docs-audit',
    version: '1.0.0',
    description: 'Audit documentation completeness',
    inputs: {
      fix: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Auto-create missing docs'
      }
    },
    outputs: {
      result: {
        type: 'object',
        description: 'Documentation audit results'
      }
    },
    tags: ['documentation', 'audit'],
    timeout: 120
  },
  execute
};

export { docsAudit };
