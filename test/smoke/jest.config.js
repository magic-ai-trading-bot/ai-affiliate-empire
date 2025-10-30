module.exports = {
  displayName: 'smoke-tests',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.smoke.spec.ts'],
  testTimeout: 30000, // 30 seconds per test
  verbose: true,
  bail: true, // Stop on first failure (smoke tests should fail fast)
  collectCoverageFrom: [],
  coveragePathIgnorePatterns: ['/node_modules/'],

  // Global setup
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },

  // Smoke tests don't need coverage
  collectCoverage: false,

  // Report configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results/smoke',
        outputName: 'junit.xml',
        suiteName: 'Smoke Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
      },
    ],
  ],
};
