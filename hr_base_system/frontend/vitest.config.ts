import { defineConfig } from 'vitest/config';

// Exclude Playwright e2e tests from Vitest's test collector.
// Vitest will otherwise try to import files that use `@playwright/test`
// which leads to the "test.describe() called here" errors.
export default defineConfig({
  test: {
    // Exclude Playwright e2e tests and node_modules test files.
    exclude: ['**/tests/e2e/**', 'tests/e2e/**', 'node_modules/**'],
    environment: 'jsdom',
    globals: true,
    // Load test setup (adds jest-dom, vitest-axe, canvas polyfill, etc.)
    setupFiles: ['src/setupTests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/setupTests.ts',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        branches: 4,
        functions: 8,
        lines: 12,
        statements: 11,
      },
    },
  },
});
