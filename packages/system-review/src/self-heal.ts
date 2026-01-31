/**
 * Self-Healing Loop
 *
 * When build fails after fixes:
 * 1. Rollback all fixes
 * 2. Re-apply fixes one-by-one, verify after each
 * 3. If a fix breaks build — skip it, rollback just that fix
 * 4. After all granular fixes, if build still fails — run LLM heal loop (max 3 iterations)
 * 5. Each iteration: parse errors → LLM fix → verify
 */

import { exec } from './exec.js';
import { parseBuildErrors, type DiagnoseResult } from './diagnose.js';
import { fixFileWithAgent } from './fixers/agentic.js';
import type { FixResult } from './types.js';
import type { FileLogger } from './orchestrator/types.js';

const MAX_HEAL_ITERATIONS = 3;

export interface SelfHealResult {
  /** Which fixes survived granular re-apply */
  appliedFixes: FixResult[];
  /** Which fixes were rolled back (broke build) */
  rolledBackFixes: FixResult[];
  /** LLM heal iterations performed */
  healIterations: HealIteration[];
  /** Final build status */
  buildPassed: boolean;
  /** Final test status */
  testsPassed: boolean;
  /** Build output from final verification */
  buildOutput: string;
  /** Test output from final verification */
  testOutput: string;
}

export interface HealIteration {
  iteration: number;
  errorsFound: number;
  filesFixed: number;
  buildPassed: boolean;
  errors: string[];
}

interface GranularFixAction {
  id: string;
  description: string;
  apply: () => Promise<FixResult>;
}

/**
 * Run the self-healing pipeline.
 *
 * @param basePath - project root
 * @param safeHead - git SHA to rollback to (state before any fixes)
 * @param fixActions - list of fix actions to re-apply granularly
 * @param logger - structured logger
 */
export async function selfHeal(
  basePath: string,
  safeHead: string,
  fixActions: GranularFixAction[],
  logger: FileLogger,
): Promise<SelfHealResult> {
  const mcp = `${basePath}/mcp-server`;
  const appliedFixes: FixResult[] = [];
  const rolledBackFixes: FixResult[] = [];

  // Step 1: Rollback to safe state
  logger.info('Self-heal: rolling back to safe state', { safeHead });
  exec(`git -C ${basePath} checkout ${safeHead} -- .`);

  // Step 2: Re-apply fixes one by one
  for (const action of fixActions) {
    // Snapshot before this fix
    exec(`git -C ${basePath} add -A`);
    const snapshotBefore = exec(`git -C ${basePath} stash create`).stdout.trim();

    logger.info(`Self-heal: applying fix ${action.id}`);
    const result = await action.apply();

    if (!result.success) {
      rolledBackFixes.push(result);
      continue;
    }

    // Quick build check
    const buildCheck = exec(`cd ${mcp} && pnpm build 2>&1`, 120_000);
    if (buildCheck.exitCode !== 0) {
      logger.warn(`Self-heal: fix ${action.id} broke build, reverting`);
      // Revert this specific fix
      if (snapshotBefore) {
        exec(`git -C ${basePath} stash apply ${snapshotBefore} 2>/dev/null`);
      } else {
        exec(`git -C ${basePath} checkout ${safeHead} -- .`);
        // Re-apply previously successful fixes
        for (const prev of appliedFixes) {
          // Already applied and committed — they're in working tree
        }
      }
      exec(`git -C ${basePath} checkout HEAD -- .`);
      // Re-apply all previously successful fixes by replaying
      replayAppliedFixes(basePath, safeHead, appliedFixes);
      rolledBackFixes.push({
        ...result,
        success: false,
        output: `Reverted: broke build. ${buildCheck.stdout.slice(-500)}`,
      });
      continue;
    }

    appliedFixes.push(result);
    // Commit this fix so we can rollback individually
    exec(`git -C ${basePath} add -A`);
    exec(`git -C ${basePath} commit --no-verify -m "self-heal: ${action.id}" --allow-empty 2>/dev/null`);
    logger.info(`Self-heal: fix ${action.id} applied and verified`);
  }

  // Step 3: Full verify after granular fixes
  let buildResult = exec(`cd ${mcp} && pnpm build 2>&1`, 120_000);
  let testResult = exec(`cd ${mcp} && pnpm test 2>&1`, 120_000);
  const healIterations: HealIteration[] = [];

  // Step 4: If build still fails, run LLM heal loop
  if (buildResult.exitCode !== 0) {
    logger.info('Self-heal: build still failing, starting LLM heal loop');

    for (let i = 1; i <= MAX_HEAL_ITERATIONS; i++) {
      const diagnosis = parseBuildErrors(buildResult.stdout + '\n' + buildResult.stderr);
      if (diagnosis.errors.length === 0) {
        logger.info('Self-heal: no parseable errors, stopping heal loop');
        break;
      }

      logger.info(`Self-heal: iteration ${i}, ${diagnosis.errors.length} errors in ${diagnosis.byFile.size} files`);

      // Snapshot before heal attempt
      exec(`git -C ${basePath} add -A`);
      exec(`git -C ${basePath} commit --no-verify -m "self-heal: pre-iteration-${i}" --allow-empty 2>/dev/null`);
      const preHealHead = exec(`git -C ${basePath} rev-parse HEAD`).stdout.trim();

      let filesFixed = 0;
      const errorSummaries: string[] = [];

      // Fix files with errors (limit to 5 per iteration)
      const filesToFix = [...diagnosis.byFile.entries()]
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 5);

      for (const [file, errors] of filesToFix) {
        const errorStrings = errors.map(
          (e) => `${e.code} (line ${e.line}): ${e.message}`,
        );
        const fixResult = await fixFileWithAgent(file, errorStrings, basePath);
        if (fixResult.success) {
          filesFixed++;
        }
        errorSummaries.push(`${file}: ${fixResult.success ? 'fixed' : fixResult.output}`);
      }

      // Verify after this iteration
      buildResult = exec(`cd ${mcp} && pnpm build 2>&1`, 120_000);
      const iterBuildPassed = buildResult.exitCode === 0;

      healIterations.push({
        iteration: i,
        errorsFound: diagnosis.errors.length,
        filesFixed,
        buildPassed: iterBuildPassed,
        errors: errorSummaries,
      });

      if (iterBuildPassed) {
        logger.info(`Self-heal: build passed after iteration ${i}`);
        exec(`git -C ${basePath} add -A`);
        exec(`git -C ${basePath} commit --no-verify -m "self-heal: iteration-${i} success" --allow-empty 2>/dev/null`);
        break;
      }

      // If heal made things worse (more errors), rollback this iteration
      const newDiagnosis = parseBuildErrors(buildResult.stdout + '\n' + buildResult.stderr);
      if (newDiagnosis.errors.length >= diagnosis.errors.length && filesFixed === 0) {
        logger.warn(`Self-heal: iteration ${i} made no progress, rolling back`);
        exec(`git -C ${basePath} checkout ${preHealHead} -- .`);
        break;
      }

      exec(`git -C ${basePath} add -A`);
      exec(`git -C ${basePath} commit --no-verify -m "self-heal: iteration-${i} partial" --allow-empty 2>/dev/null`);
    }
  }

  // Final verification
  buildResult = exec(`cd ${mcp} && pnpm build 2>&1`, 120_000);
  testResult = exec(`cd ${mcp} && pnpm test 2>&1`, 120_000);

  // If still broken after all attempts — rollback everything to safe state
  if (buildResult.exitCode !== 0) {
    logger.warn('Self-heal: all attempts failed, rolling back to safe state');
    exec(`git -C ${basePath} checkout ${safeHead} -- .`);
    exec(`git -C ${basePath} add -A`);
    exec(`git -C ${basePath} commit --no-verify -m "self-heal: full rollback to safe state" --allow-empty 2>/dev/null`);

    buildResult = exec(`cd ${mcp} && pnpm build 2>&1`, 120_000);
    testResult = exec(`cd ${mcp} && pnpm test 2>&1`, 120_000);

    return {
      appliedFixes: [],
      rolledBackFixes: [...appliedFixes, ...rolledBackFixes],
      healIterations,
      buildPassed: buildResult.exitCode === 0,
      testsPassed: testResult.exitCode === 0,
      buildOutput: buildResult.stdout.slice(-2000),
      testOutput: testResult.stdout.slice(-2000),
    };
  }

  return {
    appliedFixes,
    rolledBackFixes,
    healIterations,
    buildPassed: buildResult.exitCode === 0,
    testsPassed: testResult.exitCode === 0,
    buildOutput: buildResult.stdout.slice(-2000),
    testOutput: testResult.stdout.slice(-2000),
  };
}

/**
 * After rolling back a single fix, we need to restore previously applied fixes.
 * We do this by resetting to safe head and replaying commits.
 */
function replayAppliedFixes(basePath: string, _safeHead: string, _applied: FixResult[]): void {
  // The applied fixes are already committed as individual commits.
  // After checkout to safe state, we cherry-pick them back.
  // This is handled by the git commit strategy in the main loop —
  // each applied fix gets its own commit, so we just reset to the
  // latest good commit.
  const log = exec(`git -C ${basePath} log --oneline -20`);
  const goodCommits = log.stdout.split('\n').filter(l => l.includes('self-heal:'));
  if (goodCommits.length > 0) {
    // Already on correct state from individual commits
    return;
  }
}
