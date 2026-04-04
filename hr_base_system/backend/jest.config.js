/* eslint-disable no-undef */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globalSetup: '<rootDir>/src/tests/globalSetup.ts',
  globalTeardown: '<rootDir>/src/tests/globalTeardown.ts',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      isolatedModules: true,
      diagnostics: false
    }]
  },
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/index.ts',
    '!src/tests/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 35,
      lines: 35,
      statements: 35,
    },
  },
  verbose: true,
  testTimeout: 30000, // 30 seconds for integration tests (increased for CI stability)
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  forceExit: true, // Ensure Jest exits after tests complete
  detectOpenHandles: false, // Disable for CI performance
};
