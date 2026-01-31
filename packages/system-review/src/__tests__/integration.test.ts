/**
 * System Review Integration Tests
 * Validates the collect -> analyze -> fix pipeline without LLM calls
 */

import { describe, it, expect } from 'vitest'
import { collectAll } from '../collectors/index.js'
import { calculateScore, getHealthLevel } from '../scoring.js'
import { generateMarkdownReport } from '../report.js'

describe('System Review Integration', () => {
  describe('Collection Stage', () => {
    it('collectAll returns structured data', async () => {
      const data = await collectAll()

      expect(data).toBeDefined()
      expect(data).toHaveProperty('git')
      expect(data).toHaveProperty('typescript')
      expect(data).toHaveProperty('infra')
    })

    it('collection does not throw on missing data', async () => {
      await expect(collectAll()).resolves.not.toThrow()
    })
  })

  describe('Scoring', () => {
    it('calculateScore returns a number between 0-100', () => {
      const mockData = {
        typescript: { errors: 0, warnings: 5 },
        eslint: { errors: 0, warnings: 2 },
        security: { vulnerabilities: 0 },
        infra: { diskUsagePercent: 45, ramUsagePercent: 60 },
      }

      const score = calculateScore(mockData as never)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('getHealthLevel maps score to level', () => {
      expect(getHealthLevel(90)).toBe('healthy')
      expect(getHealthLevel(70)).toBe('warning')
      expect(getHealthLevel(30)).toBe('critical')
    })
  })

  describe('Report Generation', () => {
    it('generateMarkdownReport returns valid markdown', () => {
      const mockData = {
        git: { branch: 'main', uncommitted: 0, ahead: 0 },
        typescript: { errors: 0, warnings: 3 },
        infra: { diskUsagePercent: 50, ramUsagePercent: 40 },
      }

      const report = generateMarkdownReport(mockData as never, [], 85)
      expect(report).toContain('#')
      expect(typeof report).toBe('string')
      expect(report.length).toBeGreaterThan(50)
    })
  })
})
