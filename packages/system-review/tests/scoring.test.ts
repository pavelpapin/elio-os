import { describe, it, expect } from 'vitest';
import { calculateScore, getHealthLevel } from '../src/scoring.js';
import {
  DEFAULT_GIT, DEFAULT_TYPESCRIPT, DEFAULT_ESLINT, DEFAULT_ARCHITECTURE,
  DEFAULT_SECURITY, DEFAULT_INFRA, DEFAULT_MAINTENANCE,
} from '../src/types.js';
import type { ReviewData } from '../src/types.js';

function makeData(overrides?: Partial<ReviewData>): ReviewData {
  return {
    timestamp: new Date().toISOString(),
    git: DEFAULT_GIT,
    typescript: DEFAULT_TYPESCRIPT,
    eslint: DEFAULT_ESLINT,
    architecture: DEFAULT_ARCHITECTURE,
    security: DEFAULT_SECURITY,
    infra: DEFAULT_INFRA,
    maintenance: DEFAULT_MAINTENANCE,
    ...overrides,
  };
}

describe('calculateScore', () => {
  it('returns 100 for clean data', () => {
    expect(calculateScore(makeData())).toBe(100);
  });

  it('deducts 3 per TS error', () => {
    expect(calculateScore(makeData({ typescript: { success: false, diagnostics: [], errorCount: 5 } }))).toBe(85);
  });

  it('deducts for eslint errors and warnings', () => {
    const score = calculateScore(makeData({ eslint: { errorCount: 3, warningCount: 4, fixableCount: 0, issues: [] } }));
    // -6 errors -2 warnings = 92
    expect(score).toBe(92);
  });

  it('deducts for security vulns', () => {
    const score = calculateScore(makeData({
      security: {
        npmAudit: { total: 2, critical: 1, high: 1, moderate: 0, low: 0, vulnerabilities: [] },
        secretsFound: [],
      },
    }));
    // -15 critical -8 high = 77
    expect(score).toBe(77);
  });

  it('deducts 20 per secret found', () => {
    const score = calculateScore(makeData({
      security: {
        npmAudit: { total: 0, critical: 0, high: 0, moderate: 0, low: 0, vulnerabilities: [] },
        secretsFound: [{ file: 'a', line: 1, pattern: 'key' }],
      },
    }));
    expect(score).toBe(80);
  });

  it('deducts for disk usage >= 90', () => {
    const score = calculateScore(makeData({ infra: { ...DEFAULT_INFRA, diskUsagePercent: 92 } }));
    expect(score).toBe(85);
  });

  it('deducts for disk usage 80-89', () => {
    const score = calculateScore(makeData({ infra: { ...DEFAULT_INFRA, diskUsagePercent: 85 } }));
    expect(score).toBe(95);
  });

  it('floors at 0', () => {
    const score = calculateScore(makeData({
      typescript: { success: false, diagnostics: [], errorCount: 50 },
    }));
    expect(score).toBe(0);
  });

  it('caps at 100', () => {
    expect(calculateScore(makeData())).toBeLessThanOrEqual(100);
  });
});

describe('getHealthLevel', () => {
  it('excellent >= 90', () => expect(getHealthLevel(95)).toBe('excellent'));
  it('good >= 70', () => expect(getHealthLevel(75)).toBe('good'));
  it('warning >= 50', () => expect(getHealthLevel(55)).toBe('warning'));
  it('poor >= 30', () => expect(getHealthLevel(35)).toBe('poor'));
  it('critical < 30', () => expect(getHealthLevel(10)).toBe('critical'));
  it('boundary 90', () => expect(getHealthLevel(90)).toBe('excellent'));
  it('boundary 70', () => expect(getHealthLevel(70)).toBe('good'));
  it('boundary 50', () => expect(getHealthLevel(50)).toBe('warning'));
  it('boundary 30', () => expect(getHealthLevel(30)).toBe('poor'));
});
