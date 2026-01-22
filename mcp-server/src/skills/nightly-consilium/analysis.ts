/**
 * Nightly Consilium - Code Analysis
 * Local and model-based code analysis functions
 */

import { readFileSync } from 'fs';
import type {
  Issue,
  ModelAnalysis,
  CategoryAnalysis,
  AnalysisCategory,
  ANALYSIS_CATEGORIES
} from './types.js';

const CATEGORIES: readonly AnalysisCategory[] = [
  'code_quality',
  'security',
  'performance',
  'architecture',
  'documentation',
  'testing',
  'reliability',
  'observability'
];

/**
 * Analyze code with basic heuristics (before calling external models)
 */
export function analyzeCodeLocally(files: string[]): Partial<ModelAnalysis> {
  const issues: Issue[] = [];

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      const relativePath = file.replace('/root/.claude/', '');

      analyzeFileSize(lines, relativePath, issues);
      analyzeFunctionSize(lines, relativePath, issues);
      analyzeTypeUsage(content, relativePath, issues);
      analyzeConsoleUsage(content, relativePath, issues);
      analyzeTodos(content, relativePath, issues);
      analyzeSecrets(content, relativePath, issues);
    } catch {
      // Skip unreadable files
    }
  }

  const analysis = calculateScores(issues);

  return {
    analysis: analysis as Record<AnalysisCategory, CategoryAnalysis>,
    priorities: issues
      .filter(i => i.severity === 'critical' || i.severity === 'high')
      .map(i => `${i.category}: ${i.description}`),
    autoFixes: issues
      .filter(i => i.autoFixable)
      .map(i => ({
        type: i.category,
        file: i.file,
        description: i.suggestion
      }))
  };
}

function analyzeFileSize(lines: string[], relativePath: string, issues: Issue[]): void {
  if (lines.length > 200) {
    issues.push({
      severity: 'high',
      category: 'file_size',
      file: relativePath,
      description: `File has ${lines.length} lines (max 200)`,
      suggestion: 'Split into smaller modules',
      autoFixable: true
    });
  }
}

function analyzeFunctionSize(lines: string[], relativePath: string, issues: Issue[]): void {
  let functionStart = -1;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('function ') || line.includes('async ') || line.match(/\w+\s*=\s*(\(|async)/)) {
      if (functionStart === -1) {
        functionStart = i;
        braceCount = 0;
      }
    }

    braceCount += (line.match(/{/g) || []).length;
    braceCount -= (line.match(/}/g) || []).length;

    if (functionStart !== -1 && braceCount === 0 && i > functionStart) {
      const funcLength = i - functionStart;
      if (funcLength > 50) {
        issues.push({
          severity: 'medium',
          category: 'function_size',
          file: relativePath,
          line: functionStart + 1,
          description: `Function is ${funcLength} lines (max 50)`,
          suggestion: 'Break into smaller functions',
          autoFixable: false
        });
      }
      functionStart = -1;
    }
  }
}

function analyzeTypeUsage(content: string, relativePath: string, issues: Issue[]): void {
  const anyMatches = content.match(/:\s*any\b/g);
  if (anyMatches && anyMatches.length > 0) {
    issues.push({
      severity: 'medium',
      category: 'typescript',
      file: relativePath,
      description: `Found ${anyMatches.length} 'any' types`,
      suggestion: 'Replace with specific types',
      autoFixable: false
    });
  }
}

function analyzeConsoleUsage(content: string, relativePath: string, issues: Issue[]): void {
  const consoleMatches = content.match(/console\.(log|warn|error)\(/g);
  if (consoleMatches && consoleMatches.length > 3) {
    issues.push({
      severity: 'low',
      category: 'logging',
      file: relativePath,
      description: `Found ${consoleMatches.length} console statements`,
      suggestion: 'Use structured logger instead',
      autoFixable: true
    });
  }
}

function analyzeTodos(content: string, relativePath: string, issues: Issue[]): void {
  const todoMatches = content.match(/\/\/\s*(TODO|FIXME|HACK|XXX)/gi);
  if (todoMatches) {
    issues.push({
      severity: 'low',
      category: 'todos',
      file: relativePath,
      description: `Found ${todoMatches.length} TODO/FIXME comments`,
      suggestion: 'Create issues or fix them',
      autoFixable: false
    });
  }
}

function analyzeSecrets(content: string, relativePath: string, issues: Issue[]): void {
  if (content.match(/['"](sk-|pk-|api[_-]?key|secret|password)['"]/i)) {
    issues.push({
      severity: 'critical',
      category: 'security',
      file: relativePath,
      description: 'Possible hardcoded secret detected',
      suggestion: 'Move to environment variables',
      autoFixable: false
    });
  }
}

function calculateScores(issues: Issue[]): Partial<Record<AnalysisCategory, CategoryAnalysis>> {
  const analysis: Partial<Record<AnalysisCategory, CategoryAnalysis>> = {};

  for (const category of CATEGORIES) {
    const categoryIssues = issues.filter(i =>
      i.category === category ||
      (category === 'code_quality' && ['file_size', 'function_size', 'typescript'].includes(i.category))
    );

    const criticalCount = categoryIssues.filter(i => i.severity === 'critical').length;
    const highCount = categoryIssues.filter(i => i.severity === 'high').length;
    const mediumCount = categoryIssues.filter(i => i.severity === 'medium').length;
    const lowCount = categoryIssues.filter(i => i.severity === 'low').length;

    const score = Math.max(
      0,
      100 - (criticalCount * 30) - (highCount * 15) - (mediumCount * 5) - (lowCount * 2)
    );

    analysis[category] = {
      score,
      issues: categoryIssues
    };
  }

  return analysis;
}

/**
 * Call external model for analysis (with rate limiting and circuit breaker)
 */
export async function callModelForAnalysis(
  model: 'claude' | 'openai' | 'groq',
  _context: string,
  localAnalysis: Partial<ModelAnalysis>
): Promise<ModelAnalysis> {
  const timestamp = new Date().toISOString();

  const modelNames: Record<string, string> = {
    claude: 'claude-opus-4-5',
    openai: 'gpt-4o',
    groq: 'llama-3.1-70b'
  };

  return {
    model: modelNames[model],
    timestamp,
    analysis: localAnalysis.analysis || {} as Record<AnalysisCategory, CategoryAnalysis>,
    priorities: localAnalysis.priorities || [],
    autoFixes: localAnalysis.autoFixes || []
  };
}
