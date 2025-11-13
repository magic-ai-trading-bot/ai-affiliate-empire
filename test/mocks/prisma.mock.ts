/**
 * Mock Prisma Service for testing
 */

export const mockPrismaService = {
  product: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  video: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  blog: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  content: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  publication: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  affiliateNetwork: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  productAnalytics: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  networkAnalytics: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  platformAnalytics: {
    create: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  workflowExecution: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  optimizationLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  promptVersion: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  systemConfig: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
  $executeRawUnsafe: jest.fn(),
  $disconnect: jest.fn(),
};

export class MockPrismaService {
  product = mockPrismaService.product;
  video = mockPrismaService.video;
  blog = mockPrismaService.blog;
  content = mockPrismaService.content;
  publication = mockPrismaService.publication;
  affiliateNetwork = mockPrismaService.affiliateNetwork;
  productAnalytics = mockPrismaService.productAnalytics;
  networkAnalytics = mockPrismaService.networkAnalytics;
  platformAnalytics = mockPrismaService.platformAnalytics;
  workflowExecution = mockPrismaService.workflowExecution;
  optimizationLog = mockPrismaService.optimizationLog;
  promptVersion = mockPrismaService.promptVersion;
  systemConfig = mockPrismaService.systemConfig;
  $transaction = mockPrismaService.$transaction;
  $executeRawUnsafe = mockPrismaService.$executeRawUnsafe;
  $disconnect = mockPrismaService.$disconnect;
}
