/**
 * Smoke Test - Main Execute Function
 */

import { Skill, SmokeTestInput, SmokeTestOutput } from '../types.js';
import {
  testTelegram,
  testNotion,
  testGitHub,
  testPerplexity,
  testSlack,
  testSupabase,
} from './integrations.js';
import { checkBuild, checkSkills, checkWorkflows } from './checks.js';

export async function execute(input: SmokeTestInput): Promise<SmokeTestOutput> {
  const mode = input.mode || 'check';
  const autoFix = mode === 'fix';
  const timestamp = new Date().toISOString();
  const allFixes: string[] = [];

  // Run integration tests in parallel
  const [telegram, notion, github, perplexity, slack, supabase] = await Promise.all([
    testTelegram(),
    testNotion(),
    testGitHub(),
    testPerplexity(),
    testSlack(),
    testSupabase()
  ]);

  // Check build
  const build = await checkBuild(autoFix);
  allFixes.push(...build.fixed);

  // Check skills
  const skills = await checkSkills(autoFix);
  allFixes.push(...skills.fixes);

  // Check workflows
  const workflows = await checkWorkflows(autoFix);
  allFixes.push(...workflows.fixes);

  // Determine overall health
  let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (build.status !== 'ok') overall = 'unhealthy';
  if (skills.failed > 0) overall = 'degraded';
  if (workflows.failed > 0) overall = 'degraded';

  const integrations = { telegram, notion, github, perplexity, slack, supabase };
  const intErrors = Object.values(integrations).filter(i => i.status !== 'ok').length;
  if (intErrors > 3) overall = 'unhealthy';

  return {
    timestamp,
    mode,
    integrations,
    skills: {
      passed: skills.passed,
      failed: skills.failed,
      fixed: skills.fixed
    },
    workflows: {
      passed: workflows.passed,
      failed: workflows.failed
    },
    build: {
      status: build.status
    },
    fixes_applied: allFixes,
    overall
  };
}

export const smokeTest: Skill<SmokeTestInput, SmokeTestOutput> = {
  metadata: {
    name: 'smoke-test',
    version: '1.0.0',
    description: 'Comprehensive health check with real API calls',
    inputs: {
      mode: {
        type: 'string',
        required: false,
        default: 'check',
        description: 'Mode: check, fix, or report'
      }
    },
    outputs: {
      result: {
        type: 'object',
        description: 'Health check results'
      }
    },
    tags: ['health', 'validation', 'monitoring'],
    timeout: 300
  },
  execute
};
