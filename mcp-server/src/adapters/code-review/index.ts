/**
 * Code Review Adapter
 * Exposes code review capabilities as MCP tools
 */

import { z } from 'zod';
import { Adapter, AdapterTool } from '../../gateway/types.js';
import {
  reviewCode,
  analyzeSecurityIssues,
  formatAsMarkdown,
  SECURITY_CHECKS,
  DEFAULT_CONFIG,
} from '@elio/code-review';
import { readFile } from 'fs/promises';

// Schemas
const reviewSchema = z.object({
  path: z.string().describe('Path to file or directory to review'),
  checkSecurity: z.boolean().optional().describe('Check for security issues (default: true)'),
  checkArchitecture: z.boolean().optional().describe('Check architecture rules (default: true)'),
  checkDependencies: z.boolean().optional().describe('Check npm dependencies (default: true)'),
  maxFileLines: z.number().optional().describe('Max lines per file (default: 200)'),
  maxFunctionLines: z.number().optional().describe('Max lines per function (default: 50)'),
  output: z.enum(['markdown', 'json', 'summary']).optional().describe('Output format (default: markdown)'),
});

const securityScanSchema = z.object({
  path: z.string().describe('Path to file to scan'),
});

const checksSchema = z.object({});

const tools: AdapterTool[] = [
  {
    name: 'review',
    description: 'Comprehensive code review: security, architecture, quality, dependencies',
    type: 'read',
    schema: reviewSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof reviewSchema>;

      const result = await reviewCode(p.path, {
        checkSecurity: p.checkSecurity,
        checkArchitecture: p.checkArchitecture,
        checkDependencies: p.checkDependencies,
        maxFileLines: p.maxFileLines,
        maxFunctionLines: p.maxFunctionLines,
      });

      if (p.output === 'json') {
        return JSON.stringify(result, null, 2);
      }

      if (p.output === 'summary') {
        return result.summary;
      }

      return formatAsMarkdown(result);
    },
  },
  {
    name: 'security_scan',
    description: 'Scan a file for security vulnerabilities',
    type: 'read',
    schema: securityScanSchema,
    execute: async (params) => {
      const p = params as z.infer<typeof securityScanSchema>;
      const content = await readFile(p.path, 'utf-8');
      const issues = analyzeSecurityIssues(content, p.path);

      if (issues.length === 0) {
        return 'No security issues found.';
      }

      const lines = [`# Security Scan: ${p.path}\n`, `Found ${issues.length} issues:\n`];

      for (const issue of issues) {
        lines.push(`## [${issue.severity.toUpperCase()}] ${issue.title}`);
        lines.push(`- ${issue.description}`);
        if (issue.line) lines.push(`- Line: ${issue.line}`);
        if (issue.suggestion) lines.push(`- Fix: ${issue.suggestion}`);
        lines.push('');
      }

      return lines.join('\n');
    },
  },
  {
    name: 'list_checks',
    description: 'List all available security checks and rules',
    type: 'read',
    schema: checksSchema,
    execute: async () => {
      const lines = ['# Available Security Checks\n'];

      for (const check of SECURITY_CHECKS) {
        lines.push(`## ${check.name}`);
        lines.push(`- Severity: ${check.severity}`);
        lines.push(`- Description: ${check.description}`);
        lines.push(`- Suggestion: ${check.suggestion}`);
        lines.push('');
      }

      lines.push('\n# Architecture Rules\n');
      lines.push(`- Max file lines: ${DEFAULT_CONFIG.maxFileLines}`);
      lines.push(`- Max function lines: ${DEFAULT_CONFIG.maxFunctionLines}`);
      lines.push(`- No "any" types`);

      return lines.join('\n');
    },
  },
];

export const codeReviewAdapter: Adapter = {
  name: 'code-review',
  isAuthenticated: () => true,
  tools,
};

export default codeReviewAdapter;
