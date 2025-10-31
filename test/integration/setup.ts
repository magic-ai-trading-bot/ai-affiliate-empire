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
  await prisma.publication.deleteMany({});
  await prisma.productAnalytics.deleteMany({});
  await prisma.networkAnalytics.deleteMany({});
  await prisma.workflowLog.deleteMany({});
  await prisma.optimizationLog.deleteMany({});
  await prisma.promptVersion.deleteMany({});
  await prisma.abTest.deleteMany({});
  await prisma.video.deleteMany({});
  await prisma.blog.deleteMany({});
  await prisma.content.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.affiliateNetwork.deleteMany({});
  await prisma.systemConfig.deleteMany({});
}

// Make prisma available globally for tests
(global as any).testPrisma = prisma;
