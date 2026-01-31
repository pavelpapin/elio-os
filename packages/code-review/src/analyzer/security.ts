/**
 * Security Analysis
 */

import { SECURITY_CHECKS } from '../security-checks.js';
import { generateId } from './utils.js';
import type { Issue } from '../types.js';

export function analyzeSecurityIssues(content: string, filePath: string): Issue[] {
  const issues: Issue[] = [];

  for (const check of SECURITY_CHECKS) {
    let match;
    const regex = new RegExp(check.pattern.source, check.pattern.flags);

    while ((match = regex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      issues.push({
        id: generateId(),
        category: 'security',
        severity: check.severity,
        title: check.name,
        description: check.description,
        file: filePath,
        line: lineNumber,
        suggestion: check.suggestion,
      });
    }
  }

  return issues;
}
