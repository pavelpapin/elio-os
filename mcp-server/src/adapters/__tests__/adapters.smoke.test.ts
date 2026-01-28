/**
 * Smoke tests for MCP adapters
 *
 * Validates structural integrity of all adapters:
 * - Each adapter has name, isAuthenticated, and tools
 * - Each tool has name, description, type, schema, execute
 * - No duplicate tool names across adapters
 * - Zod schemas parse valid empty/minimal inputs without throwing
 */

import { describe, it, expect } from 'vitest';
import { adapters } from '../index.js';
import type { ToolType } from '../../gateway/types.js';

const VALID_TOOL_TYPES: ToolType[] = ['read', 'write', 'dangerous', 'sandbox'];

describe('MCP Adapters Smoke Tests', () => {
  it('should have at least one adapter', () => {
    expect(adapters.length).toBeGreaterThan(0);
  });

  it('should have no duplicate adapter names', () => {
    const names = adapters.map(a => a.name);
    const unique = new Set(names);
    expect(names.length).toBe(unique.size);
  });

  it('should have no duplicate tool names across all adapters', () => {
    const allTools: string[] = [];
    for (const adapter of adapters) {
      for (const tool of adapter.tools) {
        const fullName = `${adapter.name}_${tool.name}`;
        allTools.push(fullName);
      }
    }
    const dupes = allTools.filter((t, i) => allTools.indexOf(t) !== i);
    expect(dupes).toEqual([]);
  });

  for (const adapter of adapters) {
    describe(`adapter: ${adapter.name}`, () => {
      it('should have a non-empty name', () => {
        expect(adapter.name).toBeTruthy();
        expect(typeof adapter.name).toBe('string');
      });

      it('should have isAuthenticated function', () => {
        expect(typeof adapter.isAuthenticated).toBe('function');
        // Should not throw
        const result = adapter.isAuthenticated();
        expect(typeof result).toBe('boolean');
      });

      it('should have at least one tool', () => {
        expect(adapter.tools.length).toBeGreaterThan(0);
      });

      for (const tool of adapter.tools) {
        describe(`tool: ${tool.name}`, () => {
          it('should have required fields', () => {
            expect(tool.name).toBeTruthy();
            expect(tool.description).toBeTruthy();
            expect(VALID_TOOL_TYPES).toContain(tool.type);
            expect(tool.schema).toBeDefined();
            expect(typeof tool.execute).toBe('function');
          });

          it('should have a valid Zod schema', () => {
            // Schema should be parseable (safeParse won't throw)
            const result = tool.schema.safeParse({});
            expect(result).toHaveProperty('success');
          });
        });
      }
    });
  }
});
