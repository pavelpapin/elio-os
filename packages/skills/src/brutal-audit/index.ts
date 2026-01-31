/**
 * Brutal Audit Skill
 * Deep architectural audit of the codebase
 */

import { Skill } from '../types.js';
import {
  checkHardcodedSecrets, checkArchitecture,
  checkCodeQuality, checkVersionConsistency
} from './checks.js';

export interface BrutalAuditInput {
  focus?: 'all' | 'security' | 'architecture' | 'quality';
}

export interface AuditIssue {
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  category: string;
  issue: string;
  location?: string;
  recommendation: string;
}

export interface BrutalAuditOutput {
  timestamp: string;
  issues: AuditIssue[];
  summary: {
    p0: number;
    p1: number;
    p2: number;
    p3: number;
    total: number;
  };
  passed: string[];
}

export async function execute(input: BrutalAuditInput): Promise<BrutalAuditOutput> {
  const focus = input.focus || 'all';
  const timestamp = new Date().toISOString();
  const allIssues: AuditIssue[] = [];
  const passed: string[] = [];

  if (focus === 'all' || focus === 'security') {
    const securityIssues = await checkHardcodedSecrets();
    allIssues.push(...securityIssues);
    if (securityIssues.length === 0) passed.push('No hardcoded secrets found');
  }

  if (focus === 'all' || focus === 'architecture') {
    const archIssues = await checkArchitecture();
    allIssues.push(...archIssues);
    if (archIssues.length === 0) passed.push('Architecture follows patterns');
  }

  if (focus === 'all' || focus === 'quality') {
    const qualityIssues = await checkCodeQuality();
    allIssues.push(...qualityIssues);

    const versionIssues = await checkVersionConsistency();
    allIssues.push(...versionIssues);
    if (versionIssues.length === 0) passed.push('Package versions consistent');
  }

  const summary = {
    p0: allIssues.filter(i => i.severity === 'P0').length,
    p1: allIssues.filter(i => i.severity === 'P1').length,
    p2: allIssues.filter(i => i.severity === 'P2').length,
    p3: allIssues.filter(i => i.severity === 'P3').length,
    total: allIssues.length
  };

  return { timestamp, issues: allIssues, summary, passed };
}

export const brutalAudit: Skill<BrutalAuditInput, BrutalAuditOutput> = {
  metadata: {
    name: 'brutal-audit',
    version: '1.0.0',
    description: 'Deep architectural audit',
    inputs: {
      focus: {
        type: 'string',
        required: false,
        default: 'all',
        description: 'Audit focus: all, security, architecture, quality'
      }
    },
    outputs: {
      result: { type: 'object', description: 'Audit findings' }
    },
    tags: ['audit', 'security', 'architecture'],
    timeout: 300
  },
  execute
};

export { brutalAudit };
