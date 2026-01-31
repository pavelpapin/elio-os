/**
 * Paths Module Tests
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import { paths, ELIO_ROOT, elioPath, env } from '../index.ts';

describe('Paths Module', () => {
  describe('ELIO_ROOT', () => {
    it('is defined', () => {
      expect(ELIO_ROOT).toBeDefined();
      expect(typeof ELIO_ROOT).toBe('string');
    });

    it('defaults to ~/.claude or uses ELIO_ROOT env', () => {
      // If ELIO_ROOT is set, it should use that; otherwise ~/.claude
      const expected = process.env.ELIO_ROOT || path.join(os.homedir(), '.claude');
      expect(ELIO_ROOT).toBe(expected);
    });
  });

  describe('paths object', () => {
    it('contains all required main path properties', () => {
      expect(paths.root).toBeDefined();
      expect(paths.base).toBeDefined();
      expect(paths.skills).toBeDefined();
      expect(paths.workflows).toBeDefined();
      expect(paths.secrets).toBeDefined();
      expect(paths.mcpServer).toBeDefined();
      expect(paths.packages).toBeDefined();
      expect(paths.config).toBeDefined();
      expect(paths.team).toBeDefined();
      expect(paths.claudeMd).toBeDefined();
    });

    it('root equals ELIO_ROOT', () => {
      expect(paths.root).toBe(ELIO_ROOT);
      expect(paths.base).toBe(ELIO_ROOT);
    });

    it('paths are absolute', () => {
      expect(path.isAbsolute(paths.root)).toBe(true);
      expect(path.isAbsolute(paths.skills)).toBe(true);
      expect(path.isAbsolute(paths.secrets)).toBe(true);
    });

    it('paths are derived from root', () => {
      expect(paths.skills).toBe(path.join(ELIO_ROOT, 'skills'));
      expect(paths.workflows).toBe(path.join(ELIO_ROOT, 'workflows'));
      expect(paths.secrets).toBe(path.join(ELIO_ROOT, 'secrets'));
      expect(paths.mcpServer).toBe(path.join(ELIO_ROOT, 'mcp-server'));
    });
  });

  describe('paths.credentials', () => {
    it('contains credential paths', () => {
      expect(paths.credentials).toBeDefined();
      expect(paths.credentials.dir).toBeDefined();
      expect(paths.credentials.google).toBeDefined();
      expect(paths.credentials.googleToken).toBeDefined();
      expect(paths.credentials.perplexity).toBeDefined();
      expect(paths.credentials.supabase).toBeDefined();
    });

    it('credentials paths are under secrets directory', () => {
      expect(paths.credentials.dir).toBe(paths.secrets);
      expect(paths.credentials.google.startsWith(paths.secrets)).toBe(true);
    });
  });

  describe('paths.data', () => {
    it('contains data paths', () => {
      expect(paths.data).toBeDefined();
      expect(paths.data.dir).toBeDefined();
      expect(paths.data.notebooklmSources).toBeDefined();
      expect(paths.data.scheduler).toBeDefined();
      expect(paths.data.gtd).toBeDefined();
      expect(paths.data.headless).toBeDefined();
    });

    it('data paths are under data directory', () => {
      expect(paths.data.scheduler.startsWith(paths.data.dir)).toBe(true);
      expect(paths.data.gtd.startsWith(paths.data.dir)).toBe(true);
    });
  });

  describe('paths.logs', () => {
    it('contains log paths', () => {
      expect(paths.logs).toBeDefined();
      expect(paths.logs.dir).toBeDefined();
      expect(paths.logs.scheduler).toBeDefined();
      expect(paths.logs.daily).toBeDefined();
      expect(paths.logs.team).toBeDefined();
    });

    it('log paths are under logs directory', () => {
      expect(paths.logs.scheduler.startsWith(paths.logs.dir)).toBe(true);
      expect(paths.logs.daily.startsWith(paths.logs.dir)).toBe(true);
    });
  });

  describe('elioPath helper', () => {
    it('joins segments with ELIO_ROOT', () => {
      const result = elioPath('foo', 'bar', 'baz.txt');
      expect(result).toBe(path.join(ELIO_ROOT, 'foo', 'bar', 'baz.txt'));
    });

    it('handles single segment', () => {
      const result = elioPath('single');
      expect(result).toBe(path.join(ELIO_ROOT, 'single'));
    });

    it('handles empty segments (returns root)', () => {
      const result = elioPath();
      expect(result).toBe(ELIO_ROOT);
    });
  });

  describe('env helpers', () => {
    it('exposes environment detection booleans', () => {
      expect(typeof env.isDev).toBe('boolean');
      expect(typeof env.isProd).toBe('boolean');
      expect(typeof env.isTest).toBe('boolean');
    });

    it('exposes nodeEnv string', () => {
      expect(typeof env.nodeEnv).toBe('string');
    });

    it('has consistent values', () => {
      // Only one should be true (or none in unusual cases)
      const trueCount = [env.isDev, env.isProd, env.isTest].filter(Boolean).length;
      expect(trueCount).toBeLessThanOrEqual(1);
    });
  });
});
