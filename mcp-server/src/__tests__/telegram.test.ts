/**
 * Telegram Adapter Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { telegramAdapter } from '../adapters/telegram/index.js';

// Mock the telegram client
vi.mock('@elio/clients/telegram', () => ({
  isAuthenticated: vi.fn(() => true),
  isUserApiAuthenticated: vi.fn(() => true),
  getDefaultChatId: vi.fn(() => '123456'),
  sendMessage: vi.fn(async () => ({ message_id: 1 })),
  sendNotification: vi.fn(async () => ({ message_id: 2 })),
  getDialogs: vi.fn(async () => [
    { id: '1', name: 'Test User', type: 'user', unreadCount: 0 },
    { id: '2', name: 'Test Group', type: 'group', unreadCount: 5 },
  ]),
  searchDialogs: vi.fn(async () => [
    { id: '1', name: 'Test User', type: 'user', unreadCount: 0 },
  ]),
  getChatHistory: vi.fn(async () => ({
    chat: { id: '1', name: 'Test User', type: 'user', unreadCount: 0 },
    messages: [
      { id: 1, date: '2024-01-01', text: 'Hello', out: false, sender: 'them' },
      { id: 2, date: '2024-01-01', text: 'Hi!', out: true, sender: 'me' },
    ],
  })),
  sendUserMessage: vi.fn(async () => ({
    id: 3,
    date: '2024-01-01',
    text: 'Test message',
    out: true,
    sender: 'me',
  })),
}));

describe('Telegram Adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Structure', () => {
    it('has correct name', () => {
      expect(telegramAdapter.name).toBe('telegram');
    });

    it('has 6 tools', () => {
      expect(telegramAdapter.tools.length).toBe(6);
    });

    it('has all expected tools', () => {
      const toolNames = telegramAdapter.tools.map(t => t.name);
      expect(toolNames).toContain('send');
      expect(toolNames).toContain('notify');
      expect(toolNames).toContain('dialogs');
      expect(toolNames).toContain('search_chats');
      expect(toolNames).toContain('messages');
      expect(toolNames).toContain('send_user');
    });
  });

  describe('Authentication', () => {
    it('returns true when authenticated', () => {
      expect(telegramAdapter.isAuthenticated()).toBe(true);
    });
  });

  describe('Tools Execution', () => {
    it('send tool sends message', async () => {
      const sendTool = telegramAdapter.tools.find(t => t.name === 'send');
      const result = await sendTool!.execute({ text: 'Hello', chatId: '123' });
      expect(result).toContain('success');
      expect(result).toContain('messageId');
    });

    it('dialogs tool lists chats', async () => {
      const dialogsTool = telegramAdapter.tools.find(t => t.name === 'dialogs');
      const result = await dialogsTool!.execute({ limit: 10 });
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });

    it('search_chats tool finds chats', async () => {
      const searchTool = telegramAdapter.tools.find(t => t.name === 'search_chats');
      const result = await searchTool!.execute({ query: 'Test' });
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].name).toBe('Test User');
    });

    it('messages tool gets chat history', async () => {
      const messagesTool = telegramAdapter.tools.find(t => t.name === 'messages');
      const result = await messagesTool!.execute({ chat: 'Test User', limit: 10 });
      const parsed = JSON.parse(result);
      expect(parsed.chat).toBeDefined();
      expect(parsed.messages).toBeDefined();
      expect(parsed.messages.length).toBe(2);
    });
  });

  describe('Tool Types', () => {
    it('send is write type', () => {
      const tool = telegramAdapter.tools.find(t => t.name === 'send');
      expect(tool!.type).toBe('write');
    });

    it('dialogs is read type', () => {
      const tool = telegramAdapter.tools.find(t => t.name === 'dialogs');
      expect(tool!.type).toBe('read');
    });

    it('send_user is write type', () => {
      const tool = telegramAdapter.tools.find(t => t.name === 'send_user');
      expect(tool!.type).toBe('write');
    });
  });
});
