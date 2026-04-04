/**
 * Jest config for unit tests that don't require database access.
 * Run with: npx jest --config jest.unit.config.js
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // No globalSetup/globalTeardown - no DB needed
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      diagnostics: false,
    }],
  },
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '\\.integration\\.test\\.ts$'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  verbose: true,
  testTimeout: 10000,
  forceExit: true,
  // Ensure consistent module resolution for mocks
  roots: ['<rootDir>/src'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/index.ts',
    '!src/tests/**',
  ],
  coverageDirectory: 'coverage-unit',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
