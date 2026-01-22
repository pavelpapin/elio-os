/**
 * Tool Verification Helpers
 * Execute MCP tools with automatic deliverable verification
 */

import { executeTool } from '../gateway/registry.js';
import type { ToolResult } from '../gateway/types.js';
import { verify, VERIFY_PRESETS } from './verify/index.js';
import type { VerifyConfig, VerifyResult } from './verify/types.js';

type ToolWithVerifyResult =
  | { status: 'success'; data: unknown; duration: number; verification?: VerifyResult }
  | { status: 'error'; error: string; duration: number }
  | { status: 'blocked'; reason: string }
  | { status: 'rate_limited'; retryAfter: number };

/**
 * Execute gmail_send with automatic verification
 */
export async function sendEmailWithVerify(
  to: string,
  subject: string,
  body: string,
  runId?: string
): Promise<ToolWithVerifyResult> {
  const result = await executeTool('elio_gmail_send', { to, subject, body });

  if (result.status !== 'success') {
    return result;
  }

  const parsed = JSON.parse(result.data as string);
  if (!parsed.success || !parsed.messageId) {
    return result;
  }

  const verifyConfig = VERIFY_PRESETS.emailSent(parsed.messageId, to);
  const verification = await verify(verifyConfig, runId);

  return { ...result, verification };
}

/**
 * Execute calendar_create with automatic verification
 */
export async function createEventWithVerify(
  summary: string,
  start: string,
  end: string,
  options?: { description?: string; location?: string },
  runId?: string
): Promise<ToolWithVerifyResult> {
  const result = await executeTool('elio_calendar_create', {
    summary,
    start,
    end,
    ...options
  });

  if (result.status !== 'success') {
    return result;
  }

  const parsed = JSON.parse(result.data as string);
  if (!parsed.success || !parsed.eventId) {
    return result;
  }

  const verifyConfig = VERIFY_PRESETS.calendarEvent(parsed.eventId);
  const verification = await verify(verifyConfig, runId);

  return { ...result, verification };
}

/**
 * Generic wrapper to add verification to any tool execution
 */
export async function executeToolWithVerify(
  toolName: string,
  params: Record<string, unknown>,
  extractVerifyConfig: (result: ToolResult) => VerifyConfig | null,
  runId?: string
): Promise<ToolWithVerifyResult> {
  const result = await executeTool(toolName, params);

  if (result.status !== 'success') {
    return result;
  }

  const verifyConfig = extractVerifyConfig(result);
  if (!verifyConfig) {
    return result;
  }

  const verification = await verify(verifyConfig, runId);

  return { ...result, verification };
}
