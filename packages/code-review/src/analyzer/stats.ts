/**
 * File Statistics Analysis
 */

import { generateId } from './utils.js';
import type { Issue, FileStats, ReviewConfig } from '../types.js';

export function analyzeFileStats(content: string, filePath: string): FileStats {
  const lines = content.split('\n');
  const functionMatches = content.match(/(?:function\s+\w+|(?:async\s+)?(?:\w+\s*)?(?:=>|\([^)]*\)\s*(?:=>|{)))/g);
  const anyMatches = content.match(/:\s*any\b/g);

  let maxFunctionLength = 0;
  const funcRegex = /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>)/g;
  let funcMatch;
  while ((funcMatch = funcRegex.exec(content)) !== null) {
    const startLine = content.substring(0, funcMatch.index).split('\n').length;
    let depth = 0;
    let endLine = startLine;
    for (let i = funcMatch.index; i < content.length; i++) {
      if (content[i] === '{') depth++;
      if (content[i] === '}') {
        depth--;
        if (depth === 0) {
          endLine = content.substring(0, i).split('\n').length;
          break;
        }
      }
    }
    maxFunctionLength = Math.max(maxFunctionLength, endLine - startLine);
  }

  const importMatches = content.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g) || [];

  return {
    path: filePath,
    lines: lines.length,
    functions: functionMatches?.length || 0,
    maxFunctionLength,
    hasAnyType: (anyMatches?.length || 0) > 0,
    imports: importMatches,
  };
}

export function analyzeArchitectureIssues(stats: FileStats, config: ReviewConfig): Issue[] {
  const issues: Issue[] = [];

  if (stats.lines > config.maxFileLines) {
    issues.push({
      id: generateId(),
      category: 'architecture',
      severity: 'medium',
      title: 'file-too-large',
      description: `File has ${stats.lines} lines (max: ${config.maxFileLines})`,
      file: stats.path,
      suggestion: 'Split into smaller, focused modules',
    });
  }

  if (stats.maxFunctionLength > config.maxFunctionLines) {
    issues.push({
      id: generateId(),
      category: 'architecture',
      severity: 'medium',
      title: 'function-too-large',
      description: `Function has ${stats.maxFunctionLength} lines (max: ${config.maxFunctionLines})`,
      file: stats.path,
      suggestion: 'Break down into smaller functions',
    });
  }

  if (stats.hasAnyType) {
    issues.push({
      id: generateId(),
      category: 'quality',
      severity: 'low',
      title: 'any-type-usage',
      description: 'TypeScript "any" type detected',
      file: stats.path,
      suggestion: 'Use specific types instead of any',
    });
  }

  return issues;
}
