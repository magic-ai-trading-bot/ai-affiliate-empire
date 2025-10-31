/**
 * Integration test setup
 *
 * Sets up real database connection and cleans up after each test
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

// Clean database before each test suite
beforeAll(async () => {
  await cleanDatabase();
});

// Clean database after each test
afterEach(async () => {
  await cleanDatabase();
});

// Disconnect after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

/**
 * Clean all test data from database
 */
async function cleanDatabase() {
  // Delete in reverse order of dependencies
  await prisma.platformAnalytics.deleteMany({});
  await prisma.publication.deleteMany({});
  await prisma.productAnalytics.deleteMany({});
  await prisma.networkAnalytics.deleteMany({});
  await prisma.workflowLog.deleteMany({});
  await prisma.costOptimization.deleteMany({});
  await prisma.budgetAlert.deleteMany({});
  await prisma.dailyCostSummary.deleteMany({});
  await prisma.costEntry.deleteMany({});
  await prisma.video.deleteMany({});
  await prisma.blog.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.affiliateNetwork.deleteMany({});
  await prisma.systemConfig.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.apiKey.deleteMany({});
  await prisma.user.deleteMany({});
}

// Make prisma available globally for tests
(global as any).testPrisma = prisma;
