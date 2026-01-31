/**
 * Smoke Test - Build and Structure Checks
 */

import * as path from 'path';
import { ROOT_DIR, runCommand, fileExists, readJsonFile, listDirectories, makeExecutable, writeFile } from '../runner.js';

export async function checkBuild(autoFix: boolean): Promise<{ status: string; fixed: string[] }> {
  const fixes: string[] = [];

  const { exitCode } = await runCommand('pnpm build', { cwd: ROOT_DIR, timeout: 120000 });

  if (exitCode === 0) {
    return { status: 'ok', fixed: fixes };
  }

  if (autoFix) {
    await runCommand('pnpm install', { cwd: ROOT_DIR, timeout: 60000 });
    const { exitCode: retryCode } = await runCommand('pnpm build', { cwd: ROOT_DIR, timeout: 120000 });

    if (retryCode === 0) {
      fixes.push('Ran pnpm install to fix build');
      return { status: 'ok', fixed: fixes };
    }
  }

  return { status: 'error', fixed: fixes };
}

export async function checkSkills(autoFix: boolean): Promise<{ passed: number; failed: number; fixed: number; fixes: string[] }> {
  const skillsDir = path.join(ROOT_DIR, 'skills');
  const dirs = listDirectories(skillsDir);
  let passed = 0;
  let failed = 0;
  let fixed = 0;
  const fixes: string[] = [];

  for (const name of dirs) {
    if (name === '_template' || name === 'smoke-test') continue;

    const skillDir = path.join(skillsDir, name);
    const runShPath = path.join(skillDir, 'run.sh');
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    let hasIssues = false;

    // Check run.sh
    if (!fileExists(runShPath)) {
      hasIssues = true;
    } else {
      const { stdout } = await runCommand(`test -x "${runShPath}" && echo "yes" || echo "no"`);
      if (stdout.trim() !== 'yes') {
        if (autoFix) {
          makeExecutable(runShPath);
          fixes.push(`Added execute permission to skills/${name}/run.sh`);
          fixed++;
        } else {
          hasIssues = true;
        }
      }
    }

    // Check SKILL.md
    if (!fileExists(skillMdPath)) {
      if (autoFix) {
        writeFile(skillMdPath, `# ${name} Skill\n\nTODO: Add description.\n\n## Usage\n\n\`\`\`bash\n./run.sh\n\`\`\`\n`);
        fixes.push(`Created SKILL.md for ${name}`);
        fixed++;
      } else {
        hasIssues = true;
      }
    }

    if (hasIssues) {
      failed++;
    } else {
      passed++;
    }
  }

  return { passed, failed, fixed, fixes };
}

export async function checkWorkflows(autoFix: boolean): Promise<{ passed: number; failed: number; fixes: string[] }> {
  const workflowsDir = path.join(ROOT_DIR, 'workflows');
  const dirs = listDirectories(workflowsDir);
  let passed = 0;
  let failed = 0;
  const fixes: string[] = [];

  for (const name of dirs) {
    if (name === '_template') continue;

    const wfDir = path.join(workflowsDir, name);
    const wfJsonPath = path.join(wfDir, 'workflow.json');
    const wfMdPath = path.join(wfDir, 'WORKFLOW.md');
    let hasIssues = false;

    // Check workflow.json
    if (!fileExists(wfJsonPath)) {
      hasIssues = true;
    } else {
      const json = readJsonFile(wfJsonPath);
      if (!json) hasIssues = true;
    }

    // Check WORKFLOW.md
    if (!fileExists(wfMdPath)) {
      if (autoFix) {
        writeFile(wfMdPath, `# ${name} Workflow\n\nTODO: Add description.\n\n## Steps\n\n1. Step one\n`);
        fixes.push(`Created WORKFLOW.md for ${name}`);
      } else {
        hasIssues = true;
      }
    }

    if (hasIssues) {
      failed++;
    } else {
      passed++;
    }
  }

  return { passed, failed, fixes };
}
