/**
 * Store Module Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createStore, type Store } from '../store.ts';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Store Module', () => {
  let testDir: string;
  let testFile: string;

  beforeEach(() => {
    // Create temp directory for tests
    testDir = path.join(os.tmpdir(), `store-test-${Date.now()}`);
    testFile = path.join(testDir, 'test-store.json');
  });

  afterEach(() => {
    // Clean up test files
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('createStore', () => {
    it('creates store with default value', () => {
      const store = createStore(testFile, { count: 0 });

      expect(store).toBeDefined();
      expect(typeof store.load).toBe('function');
      expect(typeof store.save).toBe('function');
      expect(typeof store.update).toBe('function');
    });

    it('creates directory if it does not exist', () => {
      const deepPath = path.join(testDir, 'a', 'b', 'c', 'store.json');
      createStore(deepPath, {});

      expect(fs.existsSync(path.dirname(deepPath))).toBe(true);
    });

    it('adds .json extension if missing', () => {
      const noExtPath = path.join(testDir, 'no-ext');
      const store = createStore(noExtPath, { value: 1 });
      store.save({ value: 1 });

      expect(fs.existsSync(noExtPath + '.json')).toBe(true);
    });
  });

  describe('load', () => {
    it('returns default value when file does not exist', () => {
      const store = createStore(testFile, { initial: true });
      const data = store.load();

      expect(data).toEqual({ initial: true });
    });

    it('creates file with default value when loading non-existent file', () => {
      const store = createStore(testFile, { default: 'value' });
      store.load();

      expect(fs.existsSync(testFile)).toBe(true);
      const content = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
      expect(content).toEqual({ default: 'value' });
    });

    it('loads existing data from file', () => {
      // Write directly to file
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(testFile, JSON.stringify({ saved: 'data' }));

      const store = createStore(testFile, { default: true });
      const data = store.load();

      expect(data).toEqual({ saved: 'data' });
    });

    it('returns default on parse error', () => {
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(testFile, 'invalid json {{{');

      const store = createStore(testFile, { fallback: true });
      const data = store.load();

      expect(data).toEqual({ fallback: true });
    });
  });

  describe('save', () => {
    it('saves data to file', () => {
      const store = createStore(testFile, {});
      store.save({ key: 'value', num: 42 });

      const content = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
      expect(content).toEqual({ key: 'value', num: 42 });
    });

    it('pretty prints JSON', () => {
      const store = createStore(testFile, {});
      store.save({ a: 1 });

      const content = fs.readFileSync(testFile, 'utf-8');
      expect(content).toContain('\n'); // Has newlines (pretty printed)
    });

    it('overwrites existing data', () => {
      const store = createStore(testFile, {});
      store.save({ version: 1 });
      store.save({ version: 2 });

      const content = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
      expect(content).toEqual({ version: 2 });
    });
  });

  describe('update', () => {
    it('updates data using function', () => {
      const store = createStore<{ count: number }>(testFile, { count: 0 });

      const result = store.update((current) => ({
        count: current.count + 1
      }));

      expect(result).toEqual({ count: 1 });

      const loaded = store.load();
      expect(loaded).toEqual({ count: 1 });
    });

    it('chains multiple updates', () => {
      const store = createStore<{ count: number }>(testFile, { count: 0 });

      store.update((c) => ({ count: c.count + 1 }));
      store.update((c) => ({ count: c.count + 1 }));
      store.update((c) => ({ count: c.count + 1 }));

      const data = store.load();
      expect(data.count).toBe(3);
    });

    it('receives current data in updater function', () => {
      const store = createStore(testFile, { items: ['a', 'b'] });

      store.update((current) => ({
        items: [...current.items, 'c']
      }));

      const data = store.load();
      expect(data.items).toEqual(['a', 'b', 'c']);
    });
  });

  describe('complex data types', () => {
    interface ComplexData {
      nested: { deep: { value: number } };
      array: Array<{ id: number; name: string }>;
      nullValue: null;
      date: string;
    }

    it('handles complex nested structures', () => {
      const store = createStore<ComplexData>(testFile, {
        nested: { deep: { value: 0 } },
        array: [],
        nullValue: null,
        date: new Date().toISOString(),
      });

      store.save({
        nested: { deep: { value: 42 } },
        array: [
          { id: 1, name: 'first' },
          { id: 2, name: 'second' },
        ],
        nullValue: null,
        date: '2024-01-01T00:00:00.000Z',
      });

      const loaded = store.load();
      expect(loaded.nested.deep.value).toBe(42);
      expect(loaded.array).toHaveLength(2);
      expect(loaded.nullValue).toBeNull();
    });
  });
});
