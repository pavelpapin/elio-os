/**
 * Database Errors Tests
 */

import { describe, it, expect } from 'vitest';
import {
  DatabaseError,
  NotFoundError,
  ValidationError,
  ConnectionError,
} from '../errors.ts';

describe('Database Errors', () => {
  describe('DatabaseError', () => {
    it('creates error with message', () => {
      const error = new DatabaseError('Something went wrong');
      expect(error.message).toBe('Something went wrong');
      expect(error.name).toBe('DatabaseError');
      expect(error.code).toBeUndefined();
      expect(error.details).toBeUndefined();
    });

    it('creates error with code', () => {
      const error = new DatabaseError('Query failed', 'QUERY_ERROR');
      expect(error.code).toBe('QUERY_ERROR');
    });

    it('creates error with details', () => {
      const details = { table: 'users', column: 'email' };
      const error = new DatabaseError('Constraint violation', 'CONSTRAINT', details);
      expect(error.details).toEqual(details);
    });

    it('is an instance of Error', () => {
      const error = new DatabaseError('Test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DatabaseError);
    });
  });

  describe('NotFoundError', () => {
    it('creates error with resource and id', () => {
      const error = new NotFoundError('User', '123');
      expect(error.message).toBe('User not found: 123');
      expect(error.name).toBe('NotFoundError');
      expect(error.code).toBe('NOT_FOUND');
    });

    it('is an instance of DatabaseError', () => {
      const error = new NotFoundError('Task', 'abc');
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error).toBeInstanceOf(NotFoundError);
    });
  });

  describe('ValidationError', () => {
    it('creates error with message', () => {
      const error = new ValidationError('Invalid email format');
      expect(error.message).toBe('Invalid email format');
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.field).toBeUndefined();
    });

    it('creates error with field', () => {
      const error = new ValidationError('Field required', 'email');
      expect(error.field).toBe('email');
    });

    it('is an instance of DatabaseError', () => {
      const error = new ValidationError('Invalid');
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  describe('ConnectionError', () => {
    it('creates error with message', () => {
      const error = new ConnectionError('Database unreachable');
      expect(error.message).toBe('Database unreachable');
      expect(error.name).toBe('ConnectionError');
      expect(error.code).toBe('CONNECTION_ERROR');
    });

    it('is an instance of DatabaseError', () => {
      const error = new ConnectionError('Timeout');
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error).toBeInstanceOf(ConnectionError);
    });
  });
});
