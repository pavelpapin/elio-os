/**
 * Verification Module - Re-export
 * @deprecated Import from './verify/index.js' instead
 *
 * This file exists for backward compatibility.
 * The implementation has been split into modules:
 * - types.ts: Type definitions
 * - verifiers/notion.ts: Notion page verification
 * - verifiers/file.ts: File verification
 * - verifiers/email.ts: Email verification
 * - verifiers/calendar.ts: Calendar verification
 * - presets.ts: Common verification presets
 * - index.ts: Main orchestration
 */

export {
  verify,
  withVerification,
  VERIFY_PRESETS,
  type VerifyConfig,
  type VerifyResult,
  type DeliverableType,
  type Verifier
} from './verify/index.js';
