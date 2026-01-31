/**
 * Stage gate functions
 */

import type { GateResult, StageOutput, ExecutionContext, StageId, GateFunction } from './types.js';
import {
  CollectOutputSchema,
  AnalyzeOutputSchema,
  FixOutputSchema,
  SplitFilesOutputSchema,
  VerifyOutputSchema,
  ReportOutputSchema,
  DeliverOutputSchema,
} from './schemas.js';
import { DEFAULT_GIT, DEFAULT_TYPESCRIPT, DEFAULT_ESLINT } from '../types.js';

function schemaCheck(schema: { safeParse: (d: unknown) => { success: boolean; error?: unknown } }, data: unknown): GateResult | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { canProceed: false, reason: `Schema validation failed: ${String(result.error)}` };
  }
  return null;
}

export function collectGate(output: StageOutput, _ctx: ExecutionContext): GateResult {
  const fail = schemaCheck(CollectOutputSchema, output.data);
  if (fail) return fail;

  const d = output.data as {
    git: { headSha: string };
    typescript: { errorCount: number };
    eslint: { errorCount: number; warningCount: number };
  };

  const hasGit = d.git.headSha !== DEFAULT_GIT.headSha;
  const hasTs = d.typescript.errorCount !== DEFAULT_TYPESCRIPT.errorCount || d.typescript.errorCount > 0;
  const hasEslint = d.eslint.errorCount > 0 || d.eslint.warningCount > 0;

  if (!hasGit && !hasTs && !hasEslint) {
    return { canProceed: false, reason: 'All collectors returned default data — no real data collected' };
  }
  return { canProceed: true };
}

export function analyzeGate(output: StageOutput, _ctx: ExecutionContext): GateResult {
  const fail = schemaCheck(AnalyzeOutputSchema, output.data);
  return fail ?? { canProceed: true };
}

export function fixGate(output: StageOutput, _ctx: ExecutionContext): GateResult {
  const fail = schemaCheck(FixOutputSchema, output.data);
  return fail ?? { canProceed: true };
}

export function splitFilesGate(output: StageOutput, _ctx: ExecutionContext): GateResult {
  const fail = schemaCheck(SplitFilesOutputSchema, output.data);
  if (fail) return fail;
  // Always proceed — partial success is OK
  return { canProceed: true };
}

export function verifyGate(output: StageOutput, ctx: ExecutionContext): GateResult {
  const fail = schemaCheck(VerifyOutputSchema, output.data);
  if (fail) return fail;

  const fixOutput = ctx.stageOutputs.get('fix')?.data as { fixesApplied: boolean } | undefined;
  const splitOutput = ctx.stageOutputs.get('split-files')?.data as { fixesApplied?: boolean } | undefined;
  const verify = output.data as { buildPassed: boolean };

  // If fixes or splits were applied and build failed → need rollback
  const anyFixesApplied = fixOutput?.fixesApplied || splitOutput?.fixesApplied;
  if (anyFixesApplied && !verify.buildPassed) {
    return { canProceed: false, reason: 'Build failed after applying fixes' };
  }
  return { canProceed: true };
}

export function reportGate(output: StageOutput, _ctx: ExecutionContext): GateResult {
  const fail = schemaCheck(ReportOutputSchema, output.data);
  return fail ?? { canProceed: true };
}

export function deliverGate(output: StageOutput, _ctx: ExecutionContext): GateResult {
  const fail = schemaCheck(DeliverOutputSchema, output.data);
  return fail ?? { canProceed: true };
}

export const GATES: Record<StageId, GateFunction> = {
  collect: collectGate,
  analyze: analyzeGate,
  fix: fixGate,
  'split-files': splitFilesGate,
  verify: verifyGate,
  report: reportGate,
  deliver: deliverGate,
};
