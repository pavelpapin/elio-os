/**
 * Consistency check functions
 */

import { exec } from '../exec.js';
import type { ConsistencyData } from '../types.js';

interface RegistryEntity {
  name: string;
  type: 'skill' | 'workflow' | 'connector';
}

export function parseRegistryEntities(basePath: string): RegistryEntity[] {
  const result = exec(`cat ${basePath}/registry.yaml 2>/dev/null`);
  if (!result.stdout) return [];

  const entities: RegistryEntity[] = [];
  let currentSection: 'skill' | 'workflow' | 'connector' | null = null;

  for (const line of result.stdout.split('\n')) {
    if (line.match(/^skills:/i)) { currentSection = 'skill'; continue; }
    if (line.match(/^workflows:/i)) { currentSection = 'workflow'; continue; }
    if (line.match(/^connectors:/i)) { currentSection = 'connector'; continue; }
    if (line.match(/^\w/) && !line.match(/^(skills|workflows|connectors):/i)) {
      currentSection = null;
      continue;
    }

    if (currentSection) {
      const nameMatch = line.match(/^\s+-?\s*(?:name:\s*)?(\w[\w-]*)/);
      if (nameMatch) {
        entities.push({ name: nameMatch[1], type: currentSection });
      }
    }
  }

  return entities;
}

export function checkRegistryConsistency(basePath: string): ConsistencyData['registryMismatches'] {
  const entities = parseRegistryEntities(basePath);
  const mismatches: ConsistencyData['registryMismatches'] = [];

  for (const entity of entities) {
    if (entity.type === 'skill') {
      const skillDir = `${basePath}/skills/${entity.name}`;
      const exists = exec(`test -d "${skillDir}" && echo "yes"`).stdout.includes('yes');
      if (!exists) {
        mismatches.push({ entity: `skill:${entity.name}`, issue: 'In registry but no skills/ directory' });
      }
    }

    if (entity.type === 'workflow') {
      const wfDir = `${basePath}/workflows/${entity.name}`;
      const exists = exec(`test -d "${wfDir}" && echo "yes"`).stdout.includes('yes');
      if (!exists) {
        mismatches.push({ entity: `workflow:${entity.name}`, issue: 'In registry but no workflows/ directory' });
      }
      const pkgDir = `${basePath}/packages/${entity.name}`;
      const pkgExists = exec(`test -d "${pkgDir}" && echo "yes"`).stdout.includes('yes');
      if (!pkgExists) {
        mismatches.push({ entity: `workflow:${entity.name}`, issue: 'In registry but no packages/ directory' });
      }
    }

    if (entity.type === 'connector') {
      const adapterDir = `${basePath}/mcp-server/src/adapters/${entity.name}`;
      const exists = exec(`test -d "${adapterDir}" && echo "yes"`).stdout.includes('yes');
      if (!exists) {
        mismatches.push({ entity: `connector:${entity.name}`, issue: 'In registry but no adapter directory' });
      }
    }
  }

  for (const dir of ['skills', 'workflows']) {
    const result = exec(`ls -d ${basePath}/${dir}/*/ 2>/dev/null | grep -v _template`);
    for (const path of (result.stdout || '').split('\n').filter(Boolean)) {
      const name = path.replace(/\/$/, '').split('/').pop();
      if (!name) continue;
      const type = dir === 'skills' ? 'skill' : 'workflow';
      const inRegistry = entities.some(e => e.name === name && e.type === type);
      if (!inRegistry) {
        mismatches.push({ entity: `${type}:${name}`, issue: 'Directory exists but not in registry' });
      }
    }
  }

  return mismatches.slice(0, 30);
}

export function checkMissingDocs(basePath: string): ConsistencyData['missingDocs'] {
  const missing: ConsistencyData['missingDocs'] = [];
  const entities = parseRegistryEntities(basePath);

  for (const entity of entities) {
    if (entity.type === 'skill') {
      const docPath = `${basePath}/skills/${entity.name}/SKILL.md`;
      const exists = exec(`test -f "${docPath}" && echo "yes"`).stdout.includes('yes');
      if (!exists) {
        missing.push({ entity: `skill:${entity.name}`, expected: docPath.replace(basePath + '/', '') });
      }
    }

    if (entity.type === 'workflow') {
      const docPath = `${basePath}/workflows/${entity.name}/WORKFLOW.md`;
      const exists = exec(`test -f "${docPath}" && echo "yes"`).stdout.includes('yes');
      if (!exists) {
        missing.push({ entity: `workflow:${entity.name}`, expected: docPath.replace(basePath + '/', '') });
      }
    }
  }

  return missing;
}

export function findStaleFiles(basePath: string): ConsistencyData['staleFiles'] {
  const result = exec(
    `find ${basePath}/packages ${basePath}/mcp-server/src -name "*.ts" -not -path "*/node_modules/*" -not -path "*/dist/*" -mtime +90 2>/dev/null | head -50`,
  );
  if (!result.stdout) return [];

  return result.stdout.split('\n').filter(Boolean).map(path => {
    const ageResult = exec(`stat -c %Y "${path}" 2>/dev/null`);
    const mtime = parseInt(ageResult.stdout, 10) || 0;
    const days = Math.floor((Date.now() / 1000 - mtime) / 86400);
    return { path: path.replace(basePath + '/', ''), daysSinceModified: days };
  }).slice(0, 30);
}

export function findStaleContextFiles(basePath: string): ConsistencyData['staleContextFiles'] {
  const result = exec(
    `find ${basePath}/context -name "*.md" -mtime +180 2>/dev/null | head -20`,
  );
  if (!result.stdout) return [];

  return result.stdout.split('\n').filter(Boolean).map(path => {
    const ageResult = exec(`stat -c %Y "${path}" 2>/dev/null`);
    const mtime = parseInt(ageResult.stdout, 10) || 0;
    const days = Math.floor((Date.now() / 1000 - mtime) / 86400);
    return { path: path.replace(basePath + '/', ''), daysSinceModified: days };
  });
}

export function extractWorkflowsFromRegistry(basePath: string): string[] {
  const content = exec(`cat "${basePath}/registry.yaml" 2>/dev/null`).stdout || '';
  const workflows: string[] = [];
  let inWorkflows = false;

  for (const line of content.split('\n')) {
    if (line.match(/^workflows:/)) { inWorkflows = true; continue; }
    if (line.match(/^[a-z]/) && !line.startsWith('workflows:')) { inWorkflows = false; continue; }
    if (inWorkflows) {
      const match = line.match(/^\s{2}([a-z][\w-]*):/);
      if (match && !match[1].startsWith('#')) {
        workflows.push(match[1]);
      }
    }
  }
  return workflows;
}

export function extractWorkflowsFromClaude(basePath: string): string[] {
  const content = exec(`cat "${basePath}/CLAUDE.md" 2>/dev/null`).stdout || '';
  const workflows: string[] = [];
  const matches = content.match(/\|\s*`([a-z][\w-]*)`\s*\|.*\|.*\|/g) || [];
  for (const match of matches) {
    const nameMatch = match.match(/`([a-z][\w-]*)`/);
    if (nameMatch) workflows.push(nameMatch[1]);
  }
  return workflows;
}

export function extractWorkflowsFromWorkflowStandard(basePath: string): string[] {
  const content = exec(`cat "${basePath}/WORKFLOW_STANDARD.md" 2>/dev/null`).stdout || '';
  const workflows: string[] = [];
  const matches = content.match(/\|\s*([a-z][\w-]*)\s*\|\s*[AB]\s*\(/g) || [];
  for (const match of matches) {
    const nameMatch = match.match(/\|\s*([a-z][\w-]*)\s*\|/);
    if (nameMatch) workflows.push(nameMatch[1]);
  }
  return workflows;
}
