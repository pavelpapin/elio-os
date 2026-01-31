/**
 * Contract Tests - Public API Validation
 *
 * Ensures that all expected exports exist.
 * Prevents breaking changes that cause import failures in dependent packages.
 */

import { describe, test, expect } from 'vitest'
import * as workflow from '../src/index.js'

describe('@elio/workflow Public API Contract', () => {
  test('core workflow functions exist', () => {
    expect(workflow.BullMQWorkflowClient).toBeDefined()
    expect(workflow.createWorkflowClient).toBeDefined()
  })

  test('connection management functions exist', () => {
    expect(workflow.getRedisConnection).toBeDefined()
    expect(workflow.getBullMQConnection).toBeDefined()
    expect(workflow.createRedisConnection).toBeDefined()
    expect(workflow.closeRedisConnection).toBeDefined()
    expect(workflow.closeAllConnections).toBeDefined()
    expect(workflow.checkRedisHealth).toBeDefined()
    expect(workflow.checkAllRedisHealth).toBeDefined()
  })

  test('cleanup functions exist', () => {
    expect(workflow.cleanupOrphanedWorkflows).toBeDefined()
    expect(typeof workflow.cleanupOrphanedWorkflows).toBe('function')
  })

  test('health check functions exist', () => {
    expect(workflow.runHealthChecks).toBeDefined()
    expect(workflow.quickHealthCheck).toBeDefined()
  })

  test('progress reporter functions exist', () => {
    expect(workflow.ProgressReporter).toBeDefined()
    expect(workflow.createProgressReporter).toBeDefined()
  })

  test('replay safety functions exist', () => {
    expect(workflow.checkReplaySafety).toBeDefined()
    expect(workflow.generateDedupKey).toBeDefined()
  })

  test('error classes exist', () => {
    expect(workflow.WorkflowError).toBeDefined()
    expect(workflow.ConnectionError).toBeDefined()
    expect(workflow.TimeoutError).toBeDefined()
  })

  test('REDIS_KEYS constant exists', () => {
    expect(workflow.REDIS_KEYS).toBeDefined()
    expect(typeof workflow.REDIS_KEYS.workflowState).toBe('function')
  })
})

describe('Worker Critical Dependencies', () => {
  test('worker imports do not throw', async () => {
    // Simulate worker imports
    expect(() => {
      const { cleanupOrphanedWorkflows, closeAllConnections, checkAllRedisHealth } = workflow
      expect(cleanupOrphanedWorkflows).toBeDefined()
      expect(closeAllConnections).toBeDefined()
      expect(checkAllRedisHealth).toBeDefined()
    }).not.toThrow()
  })
})
