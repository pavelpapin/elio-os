/**
 * Analysis functions for Consilium code review
 */

import * as path from 'path';
import { CONFIG, Finding, ModelAnalysis } from './consilium-types.js';
import { exec, readFileContent } from './consilium-utils.js';

export function analyzeWithClaude(files: string[], context: string): ModelAnalysis {
  // Claude analysis is done by the calling agent
  // This function prepares the prompt and expects results

  const findings: Finding[] = [];

  // Basic static analysis as fallback
  for (const file of files) {
    const content = readFileContent(path.join(CONFIG.claudeDir, file));
    if (!content) continue;

    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      // Security checks
      if (line.includes('eval(') || line.includes('Function(')) {
        findings.push({
          severity: 'high',
          category: 'security',
          file,
          line: idx + 1,
          issue: 'Potential code injection via eval/Function',
          suggestion: 'Avoid eval() and new Function(). Use safer alternatives.'
        });
      }

      if (line.match(/`.*\$\{.*\}.*`/) && (line.includes('exec') || line.includes('spawn'))) {
        findings.push({
          severity: 'high',
          category: 'security',
          file,
          line: idx + 1,
          issue: 'Potential command injection in template string',
          suggestion: 'Sanitize user input before using in shell commands.'
        });
      }

      // Quality checks
      if (line.includes(': any') || line.includes(' any;') || line.includes(' any,')) {
        findings.push({
          severity: 'low',
          category: 'quality',
          file,
          line: idx + 1,
          issue: 'Use of `any` type',
          suggestion: 'Replace with proper type annotation.'
        });
      }

      // Console.log in production
      if (line.includes('console.log') && !file.includes('test') && !file.includes('spec')) {
        findings.push({
          severity: 'low',
          category: 'quality',
          file,
          line: idx + 1,
          issue: 'console.log in production code',
          suggestion: 'Use proper logging utility.'
        });
      }
    });

    // Check file length
    if (lines.length > 200) {
      findings.push({
        severity: 'medium',
        category: 'architecture',
        file,
        issue: `File has ${lines.length} lines (>200)`,
        suggestion: 'Consider splitting into smaller modules.'
      });
    }
  }

  return {
    model: 'claude-static',
    findings,
    summary: `Static analysis found ${findings.length} issues`,
    timestamp: new Date().toISOString()
  };
}

export function getGitDiff(): string {
  return exec(`cd ${CONFIG.claudeDir} && git diff --stat HEAD~5 2>/dev/null | head -50`, '');
}

export function getChangedFiles(): string[] {
  const result = exec(
    `cd ${CONFIG.claudeDir} && git diff --name-only HEAD~5 2>/dev/null | head -${CONFIG.maxFilesPerReview}`,
    ''
  );
  return result.split('\n').filter(f => f.trim() && f.endsWith('.ts'));
}

export function aggregateFindings(analyses: ModelAnalysis[]): Array<{
  issue: string;
  agreed_by: string[];
  severity: string;
  confidence: 'high' | 'medium' | 'low';
  action: 'auto_fix' | 'propose' | 'escalate';
}> {
  const findingMap: Record<string, { finding: Finding; models: string[] }> = {};

  for (const analysis of analyses) {
    for (const finding of analysis.findings) {
      const key = `${finding.file}:${finding.line || 0}:${finding.category}`;

      if (findingMap[key]) {
        findingMap[key].models.push(analysis.model);
      } else {
        findingMap[key] = { finding, models: [analysis.model] };
      }
    }
  }

  return Object.values(findingMap).map(({ finding, models }) => {
    const confidence = models.length >= 2 ? 'high' : models.length === 1 ? 'medium' : 'low';
    const action =
      finding.severity === 'critical' || finding.severity === 'high' ? 'escalate' :
      confidence === 'high' && finding.severity === 'low' ? 'auto_fix' : 'propose';

    return {
      issue: finding.issue,
      agreed_by: models,
      severity: finding.severity,
      confidence,
      action: action as 'auto_fix' | 'propose' | 'escalate'
    };
  });
}
