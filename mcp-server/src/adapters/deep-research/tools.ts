/**
 * Deep Research - MCP Tools
 * Single pipeline: all calls go through workflows/deep-research/src/runner.ts
 */

import { z } from 'zod';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import type { AdapterTool } from '../../gateway/types.js';

const RUNNER = '/root/.claude/workflows/deep-research/run.sh';

const researchSchema = z.object({
  topic: z.string().describe('Research topic or question'),
});

const resumeSchema = z.object({
  run_id: z.string().describe('Run ID to resume'),
  input_file: z.string().optional().describe('Path to user input JSON (for discovery stage)'),
});

const statusSchema = z.object({
  run_id: z.string().describe('Run ID to check'),
});

export const tools: AdapterTool[] = [
  {
    name: 'deep_research',
    description: 'Start a full deep research pipeline: discovery → planning → collection → factcheck → synthesis → devils advocate → report → review. Returns run_id for tracking.',
    type: 'read',
    schema: researchSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof researchSchema>;
      try {
        const result = execSync(
          `${RUNNER} ${escapeShell(p.topic)}`,
          { encoding: 'utf-8', timeout: 3_600_000, stdio: ['pipe', 'pipe', 'pipe'] },
        );
        return result.trim();
      } catch (err: unknown) {
        const e = err as { stdout?: string; stderr?: string };
        return JSON.stringify({
          error: 'Research failed',
          stdout: (e.stdout ?? '').toString().trim(),
          stderr: (e.stderr ?? '').toString().trim(),
        });
      }
    },
  },
  {
    name: 'deep_research_resume',
    description: 'Resume a paused or crashed research run. Use after providing discovery answers.',
    type: 'write',
    schema: resumeSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof resumeSchema>;
      const inputFlag = p.input_file ? ` --input ${escapeShell(p.input_file)}` : '';
      try {
        const result = execSync(
          `${RUNNER} --resume ${escapeShell(p.run_id)}${inputFlag}`,
          { encoding: 'utf-8', timeout: 3_600_000, stdio: ['pipe', 'pipe', 'pipe'] },
        );
        return result.trim();
      } catch (err: unknown) {
        const e = err as { stdout?: string; stderr?: string };
        return JSON.stringify({
          error: 'Resume failed',
          stdout: (e.stdout ?? '').toString().trim(),
          stderr: (e.stderr ?? '').toString().trim(),
        });
      }
    },
  },
  {
    name: 'deep_research_status',
    description: 'Check the status of a research run by reading its state file.',
    type: 'read',
    schema: statusSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof statusSchema>;
      const path = `/root/.claude/logs/workflows/deep-research/${p.run_id}/state.json`;
      try {
        return readFileSync(path, 'utf-8');
      } catch {
        return JSON.stringify({ error: `Run ${p.run_id} not found` });
      }
    },
  },
];

function escapeShell(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
