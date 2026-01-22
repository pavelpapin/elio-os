/**
 * Nightly Consilium Skill - Re-export
 * @deprecated Import from './nightly-consilium/index.js' instead
 *
 * This file exists for backward compatibility.
 * The implementation has been split into modules:
 * - types.ts: Type definitions
 * - collection.ts: Data gathering
 * - analysis.ts: Code analysis
 * - voting.ts: Consilium voting
 * - report.ts: Report generation
 * - index.ts: Main orchestration
 */

export {
  runNightlyConsilium,
  nightlyConsiliumTool,
  type ConsiliumResult,
  type ModelAnalysis,
  type Issue
} from './nightly-consilium/index.js';
