/**
 * System Review Analyzer - Issue Converter
 */

import type { ReviewResult as CodeReviewResult } from '@elio/code-review';
import type { SystemIssue } from '../types.js';
import { generateId } from './utils.js';

/**
 * Convert code review issues to system issues
 */
export function convertCodeIssues(codeResult: CodeReviewResult): SystemIssue[] {
  return codeResult.issues.map((issue) => ({
    id: generateId(),
    category: issue.category === 'security' ? 'security' :
              issue.category === 'architecture' ? 'architecture' : 'code',
    severity: issue.severity === 'critical' ? 'critical' :
              issue.severity === 'high' ? 'high' :
              issue.severity === 'medium' ? 'medium' : 'low',
    title: issue.title,
    description: issue.description,
    file: issue.file,
    line: issue.line,
    suggestion: issue.suggestion,
    autoFixable: false,
  }));
}
