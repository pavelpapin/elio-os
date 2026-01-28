import { defineConfig } from 'vitest/config';
import * as path from 'path';

const packagesDir = path.resolve(__dirname, '../packages');

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: [
      // Handle @elio/clients subpath exports (must come before base)
      {
        find: /^@elio\/clients\/(.*)$/,
        replacement: path.join(packagesDir, 'clients/src/$1/index.ts'),
      },
      // Handle base package imports
      {
        find: '@elio/shared',
        replacement: path.join(packagesDir, 'shared/src/index.ts'),
      },
      {
        find: '@elio/db',
        replacement: path.join(packagesDir, 'db/src/index.ts'),
      },
      {
        find: '@elio/executor',
        replacement: path.join(packagesDir, 'executor/src/index.ts'),
      },
      {
        find: '@elio/clients',
        replacement: path.join(packagesDir, 'clients/src/index.ts'),
      },
    ]
  }
});
