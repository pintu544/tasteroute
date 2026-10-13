import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Also runs web/lib unit tests (web has no test runner of its own). Those
  // tests use vitest globals because web has no vitest dependency to import from.
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', '../web/lib/**/*.test.ts'],
  },
});
