/**
 * BullMQ Client Integration Tests
 * Validates queue creation, job options, and state management
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { BullMQWorkflowClient } from '../bullmq/client.js'

const REDIS_AVAILABLE = process.env.REDIS_HOST || 'localhost'

describe.skipIf(!REDIS_AVAILABLE)('BullMQ Workflow Client', () => {
  let client: BullMQWorkflowClient

  beforeAll(() => {
    client = new BullMQWorkflowClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    })
  })

  afterAll(async () => {
    await client?.close()
  })

  describe('Queue Creation', () => {
    it('creates a workflow handle with ID', async () => {
      const handle = await client.start('test-workflow', { test: true }, {
        workflowId: `test-${Date.now()}`,
      })

      expect(handle).toBeDefined()
      expect(handle.workflowId).toMatch(/^test-/)
      expect(typeof handle.result).toBe('function')
    })
  })

  describe('State Management', () => {
    it('updates and queries workflow state', async () => {
      const workflowId = `state-test-${Date.now()}`

      await client.updateState(workflowId, {
        status: 'running',
        progress: 50,
      })

      const state = await client.query(workflowId, 'status')
      expect(state).toHaveProperty('status', 'running')
      expect(state).toHaveProperty('progress', 50)
    })
  })

  describe('Cancellation', () => {
    it('cancels a workflow', async () => {
      const workflowId = `cancel-test-${Date.now()}`

      await client.updateState(workflowId, { status: 'running' })
      await client.cancel(workflowId)

      const state = await client.query(workflowId, 'status')
      expect(state).toHaveProperty('status', 'cancelled')
    })
  })
})
