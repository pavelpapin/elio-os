/**
 * MCP Adapters Tests
 * Validates all adapters are properly structured and registered
 */

import { describe, it, expect } from 'vitest';
import { adapters } from '../adapters/index.ts';
import type { Adapter, AdapterTool } from '../gateway/types.ts';

describe('MCP Adapters', () => {
  describe('Adapter Registration', () => {
    it('exports adapters array', () => {
      expect(adapters).toBeDefined();
      expect(Array.isArray(adapters)).toBe(true);
    });

    it('has all 36 adapters registered', () => {
      expect(adapters.length).toBe(36);
    });

    const expectedAdapters = [
      'anysite',
      'backlog',
      'brave',
      'calendar',
      'code-review',
      'community',
      'database',
      'deep-research',
      'docs',
      'exa',
      'executor',
      'github',
      'gmail',
      'grok',
      'linkedin',
      'maintenance',
      'n8n',
      'notebook', // notebooklm adapter has name 'notebook'
      'notion',
      'perplexity',
      'person-research',
      'product-review',
      'scrapedo',
      'semanticscholar',
      'serper',
      'sheets',
      'slack',
      'sql',
      'system',
      'system-review',
      'tavily',
      'telegram',
      'twitter',
      'webscraping',
      'whisper',
      'youtube',
    ];

    it('has all expected adapters by name', () => {
      const adapterNames = adapters.map((a) => a.name);
      for (const expected of expectedAdapters) {
        expect(adapterNames).toContain(expected);
      }
    });
  });

  describe('Adapter Structure', () => {
    for (const adapter of adapters) {
      describe(`${adapter.name} adapter`, () => {
        it('has required name property', () => {
          expect(adapter.name).toBeDefined();
          expect(typeof adapter.name).toBe('string');
          expect(adapter.name.length).toBeGreaterThan(0);
        });

        it('has isAuthenticated function', () => {
          expect(adapter.isAuthenticated).toBeDefined();
          expect(typeof adapter.isAuthenticated).toBe('function');
        });

        it('isAuthenticated returns boolean', () => {
          const result = adapter.isAuthenticated();
          expect(typeof result).toBe('boolean');
        });

        it('has tools array', () => {
          expect(adapter.tools).toBeDefined();
          expect(Array.isArray(adapter.tools)).toBe(true);
        });

        it('has at least one tool', () => {
          expect(adapter.tools.length).toBeGreaterThan(0);
        });
      });
    }
  });

  describe('Tool Structure', () => {
    for (const adapter of adapters) {
      for (const tool of adapter.tools) {
        const toolId = `${adapter.name}.${tool.name}`;

        describe(`${toolId}`, () => {
          it('has required name property', () => {
            expect(tool.name).toBeDefined();
            expect(typeof tool.name).toBe('string');
          });

          it('has description', () => {
            expect(tool.description).toBeDefined();
            expect(typeof tool.description).toBe('string');
            expect(tool.description.length).toBeGreaterThan(0);
          });

          it('has valid type', () => {
            expect(tool.type).toBeDefined();
            expect(['read', 'write', 'dangerous', 'sandbox']).toContain(tool.type);
          });

          it('has schema (Zod)', () => {
            expect(tool.schema).toBeDefined();
            // Zod schemas have _def property
            expect(tool.schema).toHaveProperty('_def');
          });

          it('has execute function', () => {
            expect(tool.execute).toBeDefined();
            expect(typeof tool.execute).toBe('function');
          });
        });
      }
    }
  });

  describe('Tool Naming Conventions', () => {
    it('all tool names use snake_case', () => {
      for (const adapter of adapters) {
        for (const tool of adapter.tools) {
          // snake_case: lowercase letters and underscores only
          const isSnakeCase = /^[a-z][a-z0-9_]*$/.test(tool.name);
          expect(isSnakeCase, `${adapter.name}.${tool.name} should be snake_case`).toBe(true);
        }
      }
    });

    it('no duplicate tool names within adapter', () => {
      for (const adapter of adapters) {
        const names = adapter.tools.map((t) => t.name);
        const unique = new Set(names);
        expect(unique.size, `${adapter.name} has duplicate tool names`).toBe(names.length);
      }
    });
  });

  describe('MCP Tool Prefixing', () => {
    it('tools will get proper elio_ prefix when exposed', () => {
      // Verify the pattern: adapter.name_tool.name forms the full MCP tool name
      // Allow hyphens and digits in adapter names (like n8n, deep-research)
      for (const adapter of adapters) {
        for (const tool of adapter.tools) {
          const mcpToolName = `elio_${adapter.name}_${tool.name}`;
          expect(mcpToolName).toMatch(/^elio_[a-z0-9-]+_[a-z0-9_]+$/);
        }
      }
    });
  });

  describe('Adapter Statistics', () => {
    it('logs adapter and tool counts', () => {
      const totalTools = adapters.reduce((sum, a) => sum + a.tools.length, 0);
      const readTools = adapters.reduce(
        (sum, a) => sum + a.tools.filter((t) => t.type === 'read').length,
        0
      );
      const writeTools = adapters.reduce(
        (sum, a) => sum + a.tools.filter((t) => t.type === 'write').length,
        0
      );

      // Just assertions to track counts
      expect(totalTools).toBeGreaterThan(0);
      console.log(`Total adapters: ${adapters.length}`);
      console.log(`Total tools: ${totalTools}`);
      console.log(`Read tools: ${readTools}`);
      console.log(`Write tools: ${writeTools}`);
    });
  });
});
