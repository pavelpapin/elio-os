/**
 * ESLint Configuration for Elio OS
 * Flat config format (ESLint 9+)
 */

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.js',
      '**/*.d.ts'
    ]
  },
  {
    files: ['**/*.ts'],
    plugins: {
      import: importPlugin
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Import
      'import/no-cycle': 'error',
      'import/no-self-import': 'error',
      'import/no-useless-path-segments': 'error',

      // General
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
      'prefer-const': 'error',
      'no-var': 'error',

      // Code quality - ENFORCED (error, not warn)
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'complexity': ['error', 15],

      // No default exports
      'import/no-default-export': 'error',

      // Prevent duplicate implementations - use shared packages
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/mcp-server/src/db/**'],
            message: 'Use @elio/db instead of direct db imports'
          },
          {
            group: ['**/mcp-server/src/utils/logger*'],
            message: 'Use createLogger from @elio/shared instead'
          },
          {
            group: ['**/mcp-server/src/utils/progress/**'],
            message: 'Use notify from @elio/shared instead'
          }
        ]
      }]
    }
  },
  // Workflow-specific rules
  {
    files: ['**/packages/*/src/**/*.ts', '**/workflows/*/src/**/*.ts'],
    rules: {
      // Ensure external API calls use resilience patterns
      'no-restricted-syntax': ['error', {
        selector: 'CallExpression[callee.name="fetch"]',
        message: 'Use withResilience wrapper for external API calls'
      }]
    }
  }
);
