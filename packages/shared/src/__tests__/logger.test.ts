/**
 * Unified Logger Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger, logger, setLevel, type Logger } from '../logger.js'

describe('Unified Logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }
    setLevel('debug')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    setLevel('info')
  })

  describe('createLogger', () => {
    it('creates logger with all methods', () => {
      const log = createLogger('TestModule')
      expect(typeof log.debug).toBe('function')
      expect(typeof log.info).toBe('function')
      expect(typeof log.warn).toBe('function')
      expect(typeof log.error).toBe('function')
      expect(typeof log.child).toBe('function')
      expect(typeof log.timed).toBe('function')
    })

    it('includes context in log output', () => {
      const log = createLogger('TestModule')
      log.info('test message')

      expect(consoleSpy.log).toHaveBeenCalled()
      const output = consoleSpy.log.mock.calls[0][0]
      expect(output).toContain('[TestModule]')
      expect(output).toContain('test message')
    })

    it('supports runId parameter', () => {
      const log = createLogger('Test', 'run-123')
      log.info('with runId')

      const output = consoleSpy.log.mock.calls[0][0]
      expect(output).toContain('[run-123]')
    })
  })

  describe('log levels', () => {
    it('routes to correct console method', () => {
      const log = createLogger('Test')

      log.debug('debug')
      expect(consoleSpy.log).toHaveBeenCalled()

      log.info('info')
      expect(consoleSpy.log).toHaveBeenCalledTimes(2)

      log.warn('warn')
      expect(consoleSpy.warn).toHaveBeenCalled()

      log.error('error')
      expect(consoleSpy.error).toHaveBeenCalled()
    })

    it('includes level prefix in output', () => {
      const log = createLogger('Test')
      log.info('msg')
      expect(consoleSpy.log.mock.calls[0][0]).toContain('[INFO]')

      log.error('msg')
      expect(consoleSpy.error.mock.calls[0][0]).toContain('[ERROR]')
    })
  })

  describe('setLevel', () => {
    it('filters lower priority logs', () => {
      setLevel('warn')
      const log = createLogger('Test')

      log.debug('debug')
      log.info('info')
      log.warn('warn')
      log.error('error')

      expect(consoleSpy.log).not.toHaveBeenCalled()
      expect(consoleSpy.warn).toHaveBeenCalled()
      expect(consoleSpy.error).toHaveBeenCalled()
    })
  })

  describe('child logger', () => {
    it('creates nested context', () => {
      const parent = createLogger('Parent')
      const child = parent.child('Child')
      child.info('test')

      const output = consoleSpy.log.mock.calls[0][0]
      expect(output).toContain('[Parent:Child]')
    })
  })

  describe('timed helper', () => {
    it('returns result and logs duration', async () => {
      const log = createLogger('TimedTest')
      const result = await log.timed('fetch', async () => 42)

      expect(result).toBe(42)
      const output = consoleSpy.log.mock.calls.find(
        (c: string[]) => c[0].includes('fetch completed')
      )
      expect(output).toBeDefined()
    })

    it('rethrows errors and logs failure', async () => {
      const log = createLogger('TimedTest')
      await expect(
        log.timed('fail', async () => { throw new Error('boom') })
      ).rejects.toThrow('boom')

      expect(consoleSpy.error).toHaveBeenCalled()
      const output = consoleSpy.error.mock.calls[0][0]
      expect(output).toContain('fail failed')
    })
  })

  describe('default logger', () => {
    it('has elio context', () => {
      logger.info('test message')

      const output = consoleSpy.log.mock.calls[0][0]
      expect(output).toContain('[elio]')
      expect(output).toContain('test message')
    })
  })

  describe('data serialization', () => {
    it('includes structured data', () => {
      const log = createLogger('Test')
      log.info('message', { foo: 'bar', num: 42 })

      const output = consoleSpy.log.mock.calls[0][0]
      expect(output).toContain('foo')
      expect(output).toContain('bar')
    })
  })
})
