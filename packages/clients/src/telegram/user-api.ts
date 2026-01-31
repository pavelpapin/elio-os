/**
 * Telegram User API (MTProto via GramJS)
 * Access personal chats, dialogs, messages
 */

import { TelegramClient, sessions } from 'telegram';
import * as fs from 'fs';

const { StringSession } = sessions;

const CREDENTIALS_FILE = '/root/.claude/secrets/telegram-user.json';

interface UserApiCredentials {
  api_id: number;
  api_hash: string;
  session_file: string;
}

function getCredentials(): UserApiCredentials | null {
  try {
    const raw = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Types

export interface Dialog {
  id: string;
  name: string;
  type: 'user' | 'group' | 'channel';
  unreadCount: number;
  lastMessage?: string;
  lastMessageDate?: string;
}

export interface ChatMessage {
  id: number;
  date: string;
  text: string;
  out: boolean;
  sender: string;
}

// Client management

let client: TelegramClient | null = null;

function getSessionString(): string | null {
  const creds = getCredentials();
  if (!creds) return null;

  try {
    return fs.readFileSync(creds.session_file, 'utf8').trim();
  } catch {
    return null;
  }
}

async function getClient(): Promise<TelegramClient> {
  if (client?.connected) {
    return client;
  }

  const creds = getCredentials();
  if (!creds) {
    throw new Error('Telegram User API not configured. Create ' + CREDENTIALS_FILE);
  }

  const sessionString = getSessionString();
  if (!sessionString) {
    throw new Error('No Telegram User API session. File not found: ' + creds.session_file);
  }

  const stringSession = new StringSession(sessionString);
  client = new TelegramClient(stringSession, creds.api_id, creds.api_hash, {
    connectionRetries: 5,
    useWSS: true,
  });

  await client.connect();
  return client;
}

// Public API

export async function getDialogs(limit = 50): Promise<Dialog[]> {
  const tg = await getClient();
  const dialogs = await tg.getDialogs({ limit });

  return dialogs.map(d => ({
    id: d.id?.toString() || '',
    name: d.title || d.name || 'Unknown',
    type: d.isUser ? 'user' : d.isGroup ? 'group' : 'channel',
    unreadCount: d.unreadCount || 0,
    lastMessage: d.message?.message?.substring(0, 100),
    lastMessageDate: d.message?.date
      ? new Date(d.message.date * 1000).toISOString()
      : undefined
  }));
}

export async function searchDialogs(query: string): Promise<Dialog[]> {
  const dialogs = await getDialogs(100);
  const q = query.toLowerCase();

  return dialogs.filter(d =>
    d.name.toLowerCase().includes(q)
  );
}

export async function getMessages(
  chatId: string | number,
  limit = 30
): Promise<ChatMessage[]> {
  const tg = await getClient();
  const messages = await tg.getMessages(chatId, { limit });

  return messages
    .filter(m => m.message)
    .map(m => ({
      id: m.id,
      date: new Date(m.date * 1000).toISOString(),
      text: m.message || '',
      out: m.out || false,
      sender: m.out ? 'me' : 'them'
    }))
    .reverse();
}

export async function getChatHistory(
  chatNameOrId: string,
  limit = 30
): Promise<{ chat: Dialog | null; messages: ChatMessage[] }> {
  // Try to find by name first
  const dialogs = await searchDialogs(chatNameOrId);

  if (dialogs.length === 0) {
    // Try as ID
    try {
      const messages = await getMessages(chatNameOrId, limit);
      return { chat: null, messages };
    } catch {
      return { chat: null, messages: [] };
    }
  }

  const chat = dialogs[0];
  const messages = await getMessages(chat.id, limit);

  return { chat, messages };
}

export async function sendUserMessage(
  chatId: string | number,
  text: string
): Promise<ChatMessage> {
  const tg = await getClient();
  const result = await tg.sendMessage(chatId, { message: text });

  return {
    id: result.id,
    date: new Date().toISOString(),
    text,
    out: true,
    sender: 'me'
  };
}

export function isUserApiAuthenticated(): boolean {
  return getCredentials() !== null && getSessionString() !== null;
}

export async function disconnect(): Promise<void> {
  if (client) {
    await client.disconnect();
    client = null;
  }
}
