/**
 * Jest setup file for E2E tests
 * Runs before each E2E test suite
 */

import { PrismaClient } from '@prisma/client';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/affiliate_test';
process.env.TEMPORAL_ADDRESS = 'localhost:7233';

// Initialize Prisma client for test database
const prisma = new PrismaClient();

// Set default test timeout for E2E tests
jest.setTimeout(60000);

// Clean up database before all tests
beforeAll(async () => {
  // Clean test database
  await cleanDatabase();
});

// Clean up database after each test
afterEach(async () => {
  await cleanDatabase();
});

// Close database connection after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

/**
 * Clean all data from test database
 */
async function cleanDatabase() {
  const tables = [
    'ProductAnalytics',
    'NetworkAnalytics',
    'Video',
    'Blog',
    'Content',
    'Product',
    'AffiliateNetwork',
    'WorkflowExecution',
    'OptimizationLog',
    'PromptVersion',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (error) {
      // Table might not exist yet, ignore
    }
  }
}

export { prisma };
