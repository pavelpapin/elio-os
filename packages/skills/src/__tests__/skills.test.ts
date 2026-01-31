/**
 * Skills Package Tests
 */

import { describe, it, expect } from 'vitest';
import {
  skills,
  listSkills,
  executeSkill,
  autoTest,
  smokeTest,
  webSearch,
  codeCleanup,
  diskCleanup,
  gitMaintenance,
  depMaintenance,
  brutalAudit,
  docsAudit,
  structureAudit
} from '../index.js';

describe('Skills Registry', () => {
  it('has all expected skills', () => {
    expect(Object.keys(skills)).toHaveLength(10);
    expect(skills['auto-test']).toBeDefined();
    expect(skills['smoke-test']).toBeDefined();
    expect(skills['web-search']).toBeDefined();
    expect(skills['code-cleanup']).toBeDefined();
    expect(skills['disk-cleanup']).toBeDefined();
    expect(skills['git-maintenance']).toBeDefined();
    expect(skills['dep-maintenance']).toBeDefined();
    expect(skills['brutal-audit']).toBeDefined();
    expect(skills['docs-audit']).toBeDefined();
    expect(skills['structure-audit']).toBeDefined();
  });

  it('listSkills returns all skills', () => {
    const list = listSkills();
    expect(list).toHaveLength(10);
    expect(list.every(s => s.name && s.description && s.tags)).toBe(true);
  });

  it('throws on unknown skill', async () => {
    await expect(executeSkill('unknown-skill')).rejects.toThrow('Unknown skill');
  });
});

describe('Skill Structure', () => {
  const allSkills = [
    autoTest,
    smokeTest,
    webSearch,
    codeCleanup,
    diskCleanup,
    gitMaintenance,
    depMaintenance,
    brutalAudit,
    docsAudit,
    structureAudit
  ];

  for (const skill of allSkills) {
    describe(`${skill.metadata.name}`, () => {
      it('has required metadata', () => {
        expect(skill.metadata.name).toBeTruthy();
        expect(skill.metadata.version).toBe('1.0.0');
        expect(skill.metadata.description).toBeTruthy();
        expect(skill.metadata.inputs).toBeDefined();
        expect(skill.metadata.outputs).toBeDefined();
        expect(Array.isArray(skill.metadata.tags)).toBe(true);
        expect(skill.metadata.timeout).toBeGreaterThan(0);
      });

      it('has execute function', () => {
        expect(typeof skill.execute).toBe('function');
      });
    });
  }
});

describe('Utility Functions', () => {
  it('fileExists works', async () => {
    const { fileExists } = await import('../runner.js');
    expect(fileExists('/root/.claude/package.json')).toBe(true);
    expect(fileExists('/nonexistent')).toBe(false);
  });

  it('readJsonFile works', async () => {
    const { readJsonFile } = await import('../runner.js');
    const pkg = readJsonFile<{ name: string }>('/root/.claude/package.json');
    expect(pkg?.name).toBe('elio-os');
  });

  it('listDirectories works', async () => {
    const { listDirectories } = await import('../runner.js');
    const dirs = listDirectories('/root/.claude/packages');
    expect(dirs).toContain('skills');
    expect(dirs).toContain('shared');
  });
});
