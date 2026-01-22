/**
 * Email Verifier
 * Validates email was sent via Gmail API
 */

import { getEmail } from '../../../adapters/gmail/api.js';
import type { VerifyConfig, VerifyResult } from '../types.js';

/**
 * Verify email was sent successfully
 */
export async function verifyEmail(config: VerifyConfig): Promise<VerifyResult> {
  const messageId = config.messageId;

  if (!messageId) {
    return {
      ok: true,
      details: { note: 'No messageId provided, skipping verification' }
    };
  }

  try {
    const email = await getEmail(messageId);

    if (!email) {
      return {
        ok: false,
        error: `Email not found: ${messageId}`
      };
    }

    // Check if message is in SENT folder
    const isSent = email.labels.includes('SENT');
    if (!isSent) {
      return {
        ok: false,
        error: `Email ${messageId} not found in SENT folder`,
        details: { labels: email.labels }
      };
    }

    // Optionally verify recipient
    if (config.recipientEmail) {
      const recipientMatch = email.to.toLowerCase().includes(config.recipientEmail.toLowerCase());
      if (!recipientMatch) {
        return {
          ok: false,
          error: `Recipient mismatch: expected ${config.recipientEmail}, got ${email.to}`,
          details: { to: email.to, expected: config.recipientEmail }
        };
      }
    }

    return {
      ok: true,
      details: {
        messageId: email.id,
        to: email.to,
        subject: email.subject,
        date: email.date,
        labels: email.labels
      }
    };
  } catch (err) {
    return {
      ok: false,
      error: `Gmail verification failed: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}
