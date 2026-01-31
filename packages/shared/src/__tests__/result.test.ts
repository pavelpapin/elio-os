/**
 * Result Type Tests
 */

import { describe, it, expect } from 'vitest';
import {
  ok,
  err,
  isOk,
  isErr,
  match,
  unwrap,
  unwrapOr,
  map,
  mapErr,
  andThen,
  tryCatch,
  tryCatchAsync,
  all,
  typedErr,
  ErrorCodes,
  type Result,
} from '../result.ts';

describe('Result Type', () => {
  describe('ok()', () => {
    it('creates a success result', () => {
      const result = ok('hello');
      expect(result.ok).toBe(true);
      expect(result.data).toBe('hello');
    });

    it('works with objects', () => {
      const result = ok({ name: 'test', value: 42 });
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ name: 'test', value: 42 });
    });

    it('works with null', () => {
      const result = ok(null);
      expect(result.ok).toBe(true);
      expect(result.data).toBe(null);
    });
  });

  describe('err()', () => {
    it('creates an error result', () => {
      const result = err('something went wrong');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('something went wrong');
    });

    it('accepts code option', () => {
      const result = err('Not found', { code: 'NOT_FOUND' });
      expect(result.ok).toBe(false);
      expect(result.code).toBe('NOT_FOUND');
    });

    it('accepts details option', () => {
      const result = err('Validation error', { details: { field: 'email' } });
      expect(result.details).toEqual({ field: 'email' });
    });
  });

  describe('isOk() and isErr()', () => {
    it('isOk returns true for Ok result', () => {
      const result = ok('test');
      expect(isOk(result)).toBe(true);
      expect(isErr(result)).toBe(false);
    });

    it('isErr returns true for Err result', () => {
      const result = err('error');
      expect(isOk(result)).toBe(false);
      expect(isErr(result)).toBe(true);
    });

    it('type narrows correctly', () => {
      const result: Result<number, string> = ok(42);
      if (isOk(result)) {
        // TypeScript should know result.data is number here
        const value: number = result.data;
        expect(value).toBe(42);
      }
    });
  });

  describe('match()', () => {
    it('calls ok handler for success', () => {
      const result = ok(10);
      const output = match(result, {
        ok: (data) => `Got ${data}`,
        err: (error) => `Error: ${error}`,
      });
      expect(output).toBe('Got 10');
    });

    it('calls err handler for failure', () => {
      const result = err('oops');
      const output = match(result, {
        ok: (data) => `Got ${data}`,
        err: (error) => `Error: ${error}`,
      });
      expect(output).toBe('Error: oops');
    });

    it('passes code and details to err handler', () => {
      const result = err('Not found', { code: 'NOT_FOUND', details: { id: 123 } });
      const output = match(result, {
        ok: () => '',
        err: (error, code, details) => `${code}: ${error} (${JSON.stringify(details)})`,
      });
      expect(output).toBe('NOT_FOUND: Not found ({"id":123})');
    });
  });

  describe('unwrap()', () => {
    it('returns data for Ok result', () => {
      const result = ok('value');
      expect(unwrap(result)).toBe('value');
    });

    it('throws for Err result', () => {
      const result = err('error');
      expect(() => unwrap(result)).toThrow('error');
    });
  });

  describe('unwrapOr()', () => {
    it('returns data for Ok result', () => {
      const result = ok('actual');
      expect(unwrapOr(result, 'default')).toBe('actual');
    });

    it('returns default for Err result', () => {
      const result = err('error');
      expect(unwrapOr(result, 'default')).toBe('default');
    });
  });

  describe('map()', () => {
    it('transforms Ok value', () => {
      const result = ok(10);
      const mapped = map(result, (x) => x * 2);
      expect(isOk(mapped) && mapped.data).toBe(20);
    });

    it('passes through Err unchanged', () => {
      const result = err('error');
      const mapped = map(result, (x: number) => x * 2);
      expect(isErr(mapped) && mapped.error).toBe('error');
    });
  });

  describe('mapErr()', () => {
    it('transforms Err value', () => {
      const result = err('original');
      const mapped = mapErr(result, (e) => e.toUpperCase());
      expect(isErr(mapped) && mapped.error).toBe('ORIGINAL');
    });

    it('passes through Ok unchanged', () => {
      const result = ok(42);
      const mapped = mapErr(result, (e) => e.toUpperCase());
      expect(isOk(mapped) && mapped.data).toBe(42);
    });
  });

  describe('andThen()', () => {
    it('chains successful operations', () => {
      const result = ok(10);
      const chained = andThen(result, (x) => ok(x * 2));
      expect(isOk(chained) && chained.data).toBe(20);
    });

    it('short-circuits on error', () => {
      const result: Result<number, string> = err('first error');
      const chained = andThen(result, (x) => ok(x * 2));
      expect(isErr(chained) && chained.error).toBe('first error');
    });

    it('can return error from chain', () => {
      const result = ok(10);
      const chained = andThen(result, () => err('chain error'));
      expect(isErr(chained) && chained.error).toBe('chain error');
    });
  });

  describe('tryCatch()', () => {
    it('returns Ok for successful function', () => {
      const result = tryCatch(() => 'success');
      expect(isOk(result) && result.data).toBe('success');
    });

    it('returns Err for throwing function', () => {
      const result = tryCatch(() => {
        throw new Error('failed');
      });
      expect(isErr(result)).toBe(true);
    });

    it('uses mapError if provided', () => {
      const result = tryCatch(
        () => {
          throw new Error('original');
        },
        (e) => `Caught: ${(e as Error).message}`
      );
      expect(isErr(result) && result.error).toBe('Caught: original');
    });
  });

  describe('tryCatchAsync()', () => {
    it('returns Ok for successful async function', async () => {
      const result = await tryCatchAsync(async () => 'async success');
      expect(isOk(result) && result.data).toBe('async success');
    });

    it('returns Err for rejecting async function', async () => {
      const result = await tryCatchAsync(async () => {
        throw new Error('async failed');
      });
      expect(isErr(result)).toBe(true);
    });
  });

  describe('all()', () => {
    it('returns Ok array when all succeed', () => {
      const results = [ok(1), ok(2), ok(3)];
      const combined = all(results);
      expect(isOk(combined) && combined.data).toEqual([1, 2, 3]);
    });

    it('returns first error when any fail', () => {
      const results: Result<number, string>[] = [ok(1), err('second failed'), ok(3)];
      const combined = all(results);
      expect(isErr(combined) && combined.error).toBe('second failed');
    });

    it('handles empty array', () => {
      const combined = all([]);
      expect(isOk(combined) && combined.data).toEqual([]);
    });
  });

  describe('typedErr()', () => {
    it('creates error with code constant', () => {
      const result = typedErr('Not found', ErrorCodes.NOT_FOUND);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Not found');
      expect(result.code).toBe('NOT_FOUND');
    });

    it('includes details', () => {
      const result = typedErr('Rate limited', ErrorCodes.RATE_LIMITED, { retryAfter: 60 });
      expect(result.details).toEqual({ retryAfter: 60 });
    });
  });

  describe('ErrorCodes', () => {
    it('has all common error codes', () => {
      expect(ErrorCodes.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCodes.RATE_LIMITED).toBe('RATE_LIMITED');
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });
  });
});
