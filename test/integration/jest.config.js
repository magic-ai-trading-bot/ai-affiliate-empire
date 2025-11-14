/**
 * Jest configuration for integration tests
 */

module.exports = {
  displayName: 'integration',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../..',
  testRegex: 'test/integration/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.interface.ts',
    '!src/temporal/client.ts',
    '!src/temporal/worker.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: './coverage/integration',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@temporal/(.*)$': '<rootDir>/src/temporal/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(p-queue|p-timeout|eventemitter3)/)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/test/integration/pipelines/content-generation.integration.spec.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/test/integration/setup.ts'],
  testTimeout: 120000, // 2 minutes for integration tests
  maxWorkers: 1, // Run integration tests sequentially
};
