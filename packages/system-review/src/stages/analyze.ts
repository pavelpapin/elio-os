/**
 * Stage: Analyze — Claude builds fix plan from collected data
 * Uses Claude CLI (non-root user). Falls back to conservative plan.
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ExecutionContext } from '../orchestrator/types.js';
import type { ReviewData, FixPlan } from '../types.js';
import { FixPlanSchema } from '../types.js';
import { buildAnalysisPrompt, buildConservativePlan } from '../analyze.js';

const CLI_USER = 'elio';

function callCLI(prompt: string, timeoutMs = 90_000): string {
  const tmpDir = mkdtempSync(join(tmpdir(), 'elio-llm-'));
  const promptFile = join(tmpDir, 'prompt.txt');
  writeFileSync(promptFile, prompt, 'utf-8');

  try {
    const result = execSync(
      `sudo -u ${CLI_USER} claude --print --dangerously-skip-permissions < '${promptFile}'`,
      { encoding: 'utf-8', timeout: timeoutMs, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    return result.trim();
  } finally {
    try { execSync(`rm -rf '${tmpDir}'`); } catch { /* cleanup */ }
  }
}

function parseLLMResponse(raw: string): FixPlan {
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const obj = JSON.parse(cleaned);
  const parsed = FixPlanSchema.safeParse(obj);
  if (parsed.success) return parsed.data;

  const errors = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new Error(`Zod validation failed: ${errors}\nRaw keys: ${JSON.stringify(Object.keys(obj))}\nFirst action: ${JSON.stringify(obj.actions?.[0])}`);
}

export async function executeAnalyze(ctx: ExecutionContext): Promise<unknown> {
  const collectData = ctx.stageOutputs.get('collect')?.data as ReviewData | undefined;
  if (!collectData) throw new Error('Collect output not found');

  const prompt = buildAnalysisPrompt(collectData);
  const systemPrefix = 'You are a code health analyzer. Return ONLY valid JSON, no markdown fences, no explanation.\n\n';
  ctx.logger.info('Calling Claude CLI for analysis...');

  try {
    const raw = callCLI(systemPrefix + prompt, 120_000);
    if (!raw) throw new Error('Empty CLI response');

    const plan = parseLLMResponse(raw);
    ctx.logger.info('Plan built (CLI)', {
      actions: plan.actions.length,
      autoFix: plan.actions.filter(a => a.type === 'auto-fix').length,
      backlog: plan.actions.filter(a => a.type === 'backlog').length,
      score: plan.score,
    });
    return plan;
  } catch (err) {
    ctx.logger.warn('CLI analysis failed, falling back to conservative', { error: String(err) });
    const plan = buildConservativePlan(collectData);
    ctx.logger.info('Plan built (conservative fallback)', { actions: plan.actions.length, score: plan.score });
    return plan;
  }
}
