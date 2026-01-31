/**
 * Consistency collector
 * Validates registry.yaml vs actual files, checks staleness
 */

import { exec } from '../exec.js';
import type { ConsistencyData } from '../types.js';
import {
  checkRegistryConsistency,
  checkMissingDocs,
  findStaleFiles,
  findStaleContextFiles,
  extractWorkflowsFromRegistry,
  extractWorkflowsFromClaude,
  extractWorkflowsFromWorkflowStandard
} from './consistency-checks.js';

export function collectConsistency(basePath: string): ConsistencyData {
  return {
    registryMismatches: checkRegistryConsistency(basePath),
    missingDocs: checkMissingDocs(basePath),
    staleFiles: findStaleFiles(basePath),
    staleContextFiles: findStaleContextFiles(basePath),
    docsConsistency: checkDocsConsistency(basePath),
  };
}

function checkDocsConsistency(basePath: string): ConsistencyData['docsConsistency'] {
  const issues: ConsistencyData['docsConsistency'] = [];

  const requiredFiles = ['CLAUDE.md', 'WORKFLOW_STANDARD.md', 'STANDARDS.md', 'registry.yaml'];
  for (const file of requiredFiles) {
    const exists = exec(`test -f "${basePath}/${file}" && echo "yes"`).stdout.includes('yes');
    if (!exists) {
      issues.push({ file, issue: 'Required documentation file missing' });
    }
  }

  const deletedRefs = [
    { pattern: 'ARCHITECTURE\\.md', name: 'ARCHITECTURE.md' },
    { pattern: 'OVERVIEW-FOR-CTO', name: 'OVERVIEW-FOR-CTO.md' },
    { pattern: '/agents/', name: 'agents/' },
    { pattern: 'AGENT_STANDARDS', name: 'AGENT_STANDARDS.md' },
  ];

  for (const ref of deletedRefs) {
    for (const file of requiredFiles) {
      const filePath = `${basePath}/${file}`;
      const result = exec(`grep -l "${ref.pattern}" "${filePath}" 2>/dev/null`);
      if (result.stdout.trim()) {
        issues.push({
          file,
          issue: `References deleted file: ${ref.name}`,
          details: `Found reference to ${ref.name} which no longer exists`,
        });
      }
    }
  }

  const workflowsInRegistry = extractWorkflowsFromRegistry(basePath);
  const workflowsInClaude = extractWorkflowsFromClaude(basePath);
  const workflowsInStandard = extractWorkflowsFromWorkflowStandard(basePath);

  for (const wf of workflowsInRegistry) {
    if (!workflowsInClaude.includes(wf)) {
      issues.push({
        file: 'CLAUDE.md',
        issue: `Missing workflow: ${wf}`,
        details: `Workflow ${wf} is in registry.yaml but not in CLAUDE.md`,
      });
    }
  }

  for (const wf of workflowsInRegistry) {
    if (!workflowsInStandard.includes(wf)) {
      issues.push({
        file: 'WORKFLOW_STANDARD.md',
        issue: `Missing workflow: ${wf}`,
        details: `Workflow ${wf} is in registry.yaml but not in WORKFLOW_STANDARD.md`,
      });
    }
  }

  const claudeContent = exec(`cat "${basePath}/CLAUDE.md" 2>/dev/null`).stdout || '';
  const pathMatches = claudeContent.match(/\/root\/\.claude\/[^\s\)\"'\`]+/g) || [];
  for (const path of pathMatches.slice(0, 20)) {
    const cleanPath = path.replace(/[,\.\)\]]+$/, '');
    const exists = exec(`test -e "${cleanPath}" && echo "yes"`).stdout.includes('yes');
    if (!exists && !cleanPath.includes('{') && !cleanPath.includes('*')) {
      issues.push({
        file: 'CLAUDE.md',
        issue: 'Invalid path reference',
        details: `Path ${cleanPath} does not exist`,
      });
    }
  }

  return issues.slice(0, 20);
}
