/**
 * LinkedIn Messaging Functions (via AnySite)
 */

import { callTool } from './client.js';

export interface SendMessageOptions {
  company_urn?: string;
  timeout?: number;
}

export async function sendMessage(
  accountId: string,
  userUrn: string,
  text: string,
  options: SendMessageOptions = {}
): Promise<boolean> {
  try {
    await callTool('send_linkedin_message', {
      account_id: accountId,
      user: userUrn,
      text,
      company: options.company_urn,
      request_timeout: options.timeout || 300
    });
    return true;
  } catch {
    return false;
  }
}

export async function getChatMessages(
  accountId: string,
  userUrn: string,
  timeout?: number
): Promise<Array<{ text: string; sender: string; timestamp: string }>> {
  const result = await callTool<{ messages: Array<{ text: string; sender: string; timestamp: string }> }>(
    'get_linkedin_chat_messages',
    {
      account_id: accountId,
      user: userUrn,
      request_timeout: timeout || 300
    }
  );
  return result.messages || [];
}
