/**
 * Auto-Test Skill
 * Runs automated tests for core functionality
 */

import { Skill, AutoTestInput, AutoTestOutput } from '../types.js';
import { ROOT_DIR, getGitChangedFiles } from '../runner.js';
import { testTypeScriptCompilation, testPackageJson, testMcpTools, testAdapters } from './test-runners.js';

const ALL_MODULES = [
  'mcp-server',
  'packages/shared',
  'packages/db',
  'packages/clients',
  'packages/executor',
  'packages/deep-research',
  'packages/skills'
];

interface TestResult {
  passed: string[];
  failed: string[];
  skipped: string[];
}

async function getChangedModules(): Promise<string[]> {
  const changedFiles = await getGitChangedFiles(ROOT_DIR);
  const modules: Set<string> = new Set();

  for (const file of changedFiles) {
    for (const mod of ALL_MODULES) {
      if (file.startsWith(mod.replace('packages/', ''))) {
        modules.add(mod);
      }
    }
  }

  return modules.size > 0 ? Array.from(modules) : ALL_MODULES;
}

async function runTests(scope: 'quick' | 'changed' | 'full'): Promise<AutoTestOutput> {
  const result: TestResult = {
    passed: [],
    failed: [],
    skipped: []
  };

  const modules = scope === 'full' ? ALL_MODULES : await getChangedModules();

  if (scope === 'quick') {
    for (const mod of modules) {
      await testPackageJson(mod, result);
    }
    await testMcpTools(result);
  } else {
    for (const mod of modules) {
      await testPackageJson(mod, result);
      await testTypeScriptCompilation(mod, result);
    }

    if (modules.includes('mcp-server') || scope === 'full') {
      await testMcpTools(result);
      await testAdapters(result);
    }
  }

  const total = result.passed.length + result.failed.length;
  const passRate = total > 0 ? Math.round((result.passed.length / total) * 100) : 0;

  return {
    version: '1.0.0',
    scope,
    passed: result.failed.length === 0,
    summary: {
      total,
      passed: result.passed.length,
      failed: result.failed.length,
      skipped: result.skipped.length,
      pass_rate: passRate
    },
    passed_tests: result.passed,
    failures: result.failed,
    skipped_tests: result.skipped
  };
}

export async function execute(input: AutoTestInput): Promise<AutoTestOutput> {
  const scope = input.scope || 'changed';
  return runTests(scope);
}

export const autoTest: Skill<AutoTestInput, AutoTestOutput> = {
  metadata: {
    name: 'auto-test',
    version: '1.0.0',
    description: 'Automated testing for core functionality',
    inputs: {
      scope: {
        type: 'string',
        required: false,
        default: 'changed',
        description: 'Test scope: quick, changed, or full'
      }
    },
    outputs: {
      result: {
        type: 'object',
        description: 'Test results with pass/fail counts'
      }
    },
    tags: ['testing', 'validation', 'ci'],
    timeout: 300
  },
  execute
};

export { autoTest };
