/**
 * GitHub Connector Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as github from '../github/index.js';

describe('GitHub Connector', () => {
  describe('Module Exports', () => {
    it('exports searchRepos function', () => {
      expect(github.searchRepos).toBeDefined();
      expect(typeof github.searchRepos).toBe('function');
    });

    it('exports searchCode function', () => {
      expect(github.searchCode).toBeDefined();
      expect(typeof github.searchCode).toBe('function');
    });

    it('exports searchIssues function', () => {
      expect(github.searchIssues).toBeDefined();
      expect(typeof github.searchIssues).toBe('function');
    });

    it('exports searchUsers function', () => {
      expect(github.searchUsers).toBeDefined();
      expect(typeof github.searchUsers).toBe('function');
    });

    it('exports getRepo function', () => {
      expect(github.getRepo).toBeDefined();
      expect(typeof github.getRepo).toBe('function');
    });

    it('exports getReadme function', () => {
      expect(github.getReadme).toBeDefined();
      expect(typeof github.getReadme).toBe('function');
    });

    it('exports getUser function', () => {
      expect(github.getUser).toBeDefined();
      expect(typeof github.getUser).toBe('function');
    });

    it('exports researchTopic function', () => {
      expect(github.researchTopic).toBeDefined();
      expect(typeof github.researchTopic).toBe('function');
    });

    it('exports getTrending function', () => {
      expect(github.getTrending).toBeDefined();
      expect(typeof github.getTrending).toBe('function');
    });

    it('exports isAuthenticated function', () => {
      expect(github.isAuthenticated).toBeDefined();
      expect(typeof github.isAuthenticated).toBe('function');
    });

    it('exports getCacheStats function', () => {
      expect(github.getCacheStats).toBeDefined();
      expect(typeof github.getCacheStats).toBe('function');
    });

    it('exports clearCache function', () => {
      expect(github.clearCache).toBeDefined();
      expect(typeof github.clearCache).toBe('function');
    });
  });

  describe('Cache Operations', () => {
    beforeEach(() => {
      github.clearCache();
    });

    it('getCacheStats returns cache size', () => {
      const stats = github.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(typeof stats.size).toBe('number');
    });

    it('clearCache resets cache to empty', () => {
      github.clearCache();
      const stats = github.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Authentication', () => {
    it('isAuthenticated returns boolean', () => {
      const result = github.isAuthenticated();
      expect(typeof result).toBe('boolean');
    });
  });
});
