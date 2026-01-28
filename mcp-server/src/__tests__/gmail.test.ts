/**
 * Gmail Adapter Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gmailAdapter } from '../adapters/gmail/index.js';

// Mock the gmail client
vi.mock('@elio/clients/gmail', () => ({
  isAuthenticated: vi.fn(() => true),
  listEmails: vi.fn(async () => [
    {
      id: 'msg1',
      threadId: 'thread1',
      from: 'test@example.com',
      to: 'me@example.com',
      subject: 'Test Email',
      date: '2024-01-01',
      snippet: 'This is a test...',
      labels: ['INBOX'],
    },
  ]),
  getEmail: vi.fn(async (id: string) => ({
    id,
    threadId: 'thread1',
    from: 'test@example.com',
    to: 'me@example.com',
    subject: 'Test Email',
    date: '2024-01-01',
    snippet: 'This is a test...',
    body: 'This is the full email body.',
    labels: ['INBOX'],
  })),
  sendEmail: vi.fn(async () => ({
    success: true,
    messageId: 'sent1',
  })),
}));

// Mock rate limiter and circuit breaker
vi.mock('../../utils/rate-limiter.js', () => ({
  withRateLimit: vi.fn((_, fn) => fn()),
}));

vi.mock('../../utils/circuit-breaker.js', () => ({
  withCircuitBreaker: vi.fn((_, fn) => fn()),
}));

describe('Gmail Adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Structure', () => {
    it('has correct name', () => {
      expect(gmailAdapter.name).toBe('gmail');
    });

    it('has 3 tools', () => {
      expect(gmailAdapter.tools.length).toBe(3);
    });

    it('has all expected tools', () => {
      const toolNames = gmailAdapter.tools.map(t => t.name);
      expect(toolNames).toContain('list');
      expect(toolNames).toContain('read');
      expect(toolNames).toContain('send');
    });
  });

  describe('Authentication', () => {
    it('returns true when authenticated', () => {
      expect(gmailAdapter.isAuthenticated()).toBe(true);
    });
  });

  describe('Tools Execution', () => {
    it('list tool returns emails', async () => {
      const listTool = gmailAdapter.tools.find(t => t.name === 'list');
      const result = await listTool!.execute({ query: '', maxResults: 10 });
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].subject).toBe('Test Email');
    });

    it('read tool returns email details', async () => {
      const readTool = gmailAdapter.tools.find(t => t.name === 'read');
      const result = await readTool!.execute({ messageId: 'msg1' });
      const parsed = JSON.parse(result);
      expect(parsed.id).toBe('msg1');
      expect(parsed.body).toBe('This is the full email body.');
    });

    it('send tool sends email', async () => {
      const sendTool = gmailAdapter.tools.find(t => t.name === 'send');
      const result = await sendTool!.execute({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body',
      });
      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
    });
  });

  describe('Tool Types', () => {
    it('list is read type', () => {
      const tool = gmailAdapter.tools.find(t => t.name === 'list');
      expect(tool!.type).toBe('read');
    });

    it('read is read type', () => {
      const tool = gmailAdapter.tools.find(t => t.name === 'read');
      expect(tool!.type).toBe('read');
    });

    it('send is dangerous type', () => {
      const tool = gmailAdapter.tools.find(t => t.name === 'send');
      expect(tool!.type).toBe('dangerous');
    });
  });
});
