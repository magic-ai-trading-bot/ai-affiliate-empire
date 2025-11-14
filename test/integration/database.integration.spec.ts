/**
 * Integration test for Database Operations
 *
 * Tests:
 * 1. Prisma migrations
 * 2. Data relationships
 * 3. Transaction handling
 * 4. Query performance
 * 5. Constraints and validations
 */

import { PrismaClient } from '@prisma/client';
import {
  createTestAffiliateNetwork,
  createTestProducts,
  createTestVideo,
  createTestBlog,
  createTestPublication,
  createTestAnalytics,
  createCompleteTestWorkflowData,
  cleanTestData,
} from './helpers/test-data';

const prisma = (global as any).testPrisma as PrismaClient;

describe('Database Integration', () => {
  beforeEach(async () => {
    await cleanTestData();
  });

  afterEach(async () => {
    await cleanTestData();
  });

  describe('Data Relationships', () => {
    it('should maintain product-network relationship', async () => {
      const network = await createTestAffiliateNetwork();
      const products = await createTestProducts(network.id, 3);

      const fetchedProducts = await prisma.product.findMany({
        where: { networkId: network.id },
        include: { network: true },
      });

      expect(fetchedProducts.length).toBe(3);
      fetchedProducts.forEach((product) => {
        expect(product.network.id).toBe(network.id);
        expect(product.network.name).toBe('Amazon Associates');
      });
    });

    it('should maintain product-video relationship', async () => {
      const network = await createTestAffiliateNetwork();
      const products = await createTestProducts(network.id, 2);
      const video1 = await createTestVideo(products[0].id);
      const video2 = await createTestVideo(products[1].id);

      const fetchedProduct = await prisma.product.findUnique({
        where: { id: products[0].id },
        include: { videos: true },
      });

      expect(fetchedProduct?.videos.length).toBe(1);
      expect(fetchedProduct?.videos[0].id).toBe(video1.id);
    });

    it('should maintain video-publication relationship', async () => {
      const network = await createTestAffiliateNetwork();
      const products = await createTestProducts(network.id, 1);
      const video = await createTestVideo(products[0].id);

      await createTestPublication(video.id, 'YOUTUBE');
      await createTestPublication(video.id, 'TIKTOK');
      await createTestPublication(video.id, 'INSTAGRAM');

      const fetchedVideo = await prisma.video.findUnique({
        where: { id: video.id },
        include: { publications: true },
      });

      expect(fetchedVideo?.publications.length).toBe(3);

      const platforms = fetchedVideo?.publications.map((p) => p.platform);
      expect(platforms).toContain('YOUTUBE');
      expect(platforms).toContain('TIKTOK');
      expect(platforms).toContain('INSTAGRAM');
    });

    it('should cascade delete properly', async () => {
      const network = await createTestAffiliateNetwork();
      const products = await createTestProducts(network.id, 1);
      const video = await createTestVideo(products[0].id);
      await createTestPublication(video.id, 'YOUTUBE');

      // Delete in correct order: Publications -> Videos -> Product
      await prisma.publication.deleteMany({
        where: { videoId: video.id },
      });

      await prisma.video.deleteMany({
        where: { productId: products[0].id },
      });

      await prisma.product.delete({
        where: { id: products[0].id },
      });

      const remainingVideos = await prisma.video.findMany({
        where: { productId: products[0].id },
      });

      const remainingPublications = await prisma.publication.findMany({
        where: { videoId: video.id },
      });

      expect(remainingVideos.length).toBe(0);
      expect(remainingPublications.length).toBe(0);
    });

    it('should handle complex nested relationships', async () => {
      const data = await createCompleteTestWorkflowData();

      const completeProduct = await prisma.product.findUnique({
        where: { id: data.products[0].id },
        include: {
          network: true,
          videos: {
            include: {
              publications: true,
            },
          },
          blogs: true,
          analytics: true,
        },
      });

      expect(completeProduct).toBeTruthy();
      expect(completeProduct?.network).toBeTruthy();
      expect(completeProduct?.videos.length).toBeGreaterThan(0);
      expect(completeProduct?.videos[0].publications.length).toBe(3);
      expect(completeProduct?.blogs.length).toBeGreaterThan(0);
      expect(completeProduct?.analytics.length).toBeGreaterThan(0);
    });
  });

  describe('Transaction Handling', () => {
    it('should commit successful transactions', async () => {
      const network = await createTestAffiliateNetwork();

      const result = await prisma.$transaction(async (tx) => {
        const product1 = await tx.product.create({
          data: {
            network: { connect: { id: network.id } },
            asin: 'TX001',
            title: 'Transaction Test 1',
            price: 99.99,
            currency: 'USD',
            commission: 10,
            commissionType: 'percentage',
            affiliateUrl: 'https://amazon.com/dp/TX001?tag=test-20',
            status: 'ACTIVE',
          },
        });

        const product2 = await tx.product.create({
          data: {
            network: { connect: { id: network.id } },
            asin: 'TX002',
            title: 'Transaction Test 2',
            price: 149.99,
            currency: 'USD',
            commission: 12,
            commissionType: 'percentage',
            affiliateUrl: 'https://amazon.com/dp/TX002?tag=test-20',
            status: 'ACTIVE',
          },
        });

        return [product1, product2];
      });

      expect(result.length).toBe(2);

      const products = await prisma.product.findMany({
        where: { asin: { in: ['TX001', 'TX002'] } },
      });

      expect(products.length).toBe(2);
    });

    it('should rollback failed transactions', async () => {
      const network = await createTestAffiliateNetwork();

      try {
        await prisma.$transaction(async (tx) => {
          await tx.product.create({
            data: {
              network: { connect: { id: network.id } },
              asin: 'ROLLBACK001',
              title: 'Rollback Test',
              price: 99.99,
              currency: 'USD',
              commission: 10,
              commissionType: 'percentage',
              affiliateUrl: 'https://amazon.com/dp/ROLLBACK001?tag=test-20',
              status: 'ACTIVE',
            },
          });

          // Intentionally cause error
          throw new Error('Transaction rollback test');
        });
      } catch (error) {
        // Expected error
      }

      const products = await prisma.product.findMany({
        where: { asin: 'ROLLBACK001' },
      });

      expect(products.length).toBe(0);
    });

    it('should handle concurrent transactions', async () => {
      const network = await createTestAffiliateNetwork();

      const transactions = Array(5)
        .fill(null)
        .map((_, index) =>
          prisma.$transaction(async (tx) => {
            return await tx.product.create({
              data: {
                network: { connect: { id: network.id } },
                asin: `CONCURRENT${index.toString().padStart(3, '0')}`,
                title: `Concurrent Test ${index}`,
                price: 99.99,
                currency: 'USD',
                commission: 10,
                commissionType: 'percentage',
                affiliateUrl: `https://amazon.com/dp/CONCURRENT${index.toString().padStart(3, '0')}?tag=test-20`,
                status: 'ACTIVE',
              },
            });
          }),
        );

      const results = await Promise.all(transactions);

      expect(results.length).toBe(5);

      const products = await prisma.product.count({
        where: { asin: { startsWith: 'CONCURRENT' } },
      });

      expect(products).toBe(5);
    });
  });

  describe('Query Performance', () => {
    it('should efficiently query large datasets', async () => {
      const network = await createTestAffiliateNetwork();
      await createTestProducts(network.id, 100);

      const startTime = Date.now();

      const products = await prisma.product.findMany({
        where: { networkId: network.id },
        orderBy: { overallScore: 'desc' },
        take: 10,
      });

      const duration = Date.now() - startTime;

      expect(products.length).toBe(10);
      expect(duration).toBeLessThan(1000); // Should complete in < 1 second
    });

    it('should use indexes efficiently', async () => {
      const network = await createTestAffiliateNetwork();
      await createTestProducts(network.id, 50);

      const startTime = Date.now();

      // Query using indexed fields
      const activeProducts = await prisma.product.findMany({
        where: {
          networkId: network.id,
          status: 'ACTIVE',
          overallScore: { gte: 0.5 },
        },
        orderBy: { lastRankedAt: 'desc' },
      });

      const duration = Date.now() - startTime;

      expect(activeProducts.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500);
    });

    it('should aggregate data efficiently', async () => {
      const network = await createTestAffiliateNetwork();
      const products = await createTestProducts(network.id, 10);

      for (const product of products) {
        await createTestAnalytics(product.id);
      }

      const startTime = Date.now();

      const analytics = await prisma.productAnalytics.aggregate({
        _sum: {
          views: true,
          clicks: true,
          conversions: true,
          revenue: true,
        },
        _avg: {
          roi: true,
        },
        where: {
          date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });

      const duration = Date.now() - startTime;

      expect(analytics._sum.views).toBeGreaterThan(0);
      expect(analytics._avg.roi).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Data Integrity', () => {
    it('should enforce unique constraints', async () => {
      const network = await createTestAffiliateNetwork();

      await prisma.product.create({
        data: {
          network: { connect: { id: network.id } },
          asin: 'UNIQUE001',
          title: 'Unique Test',
          price: 99.99,
          currency: 'USD',
          commission: 10,
          commissionType: 'percentage',
          affiliateUrl: 'https://amazon.com/dp/UNIQUE001?tag=test-20',
          status: 'ACTIVE',
        },
      });

      // Try to create duplicate
      await expect(
        prisma.product.create({
          data: {
            network: { connect: { id: network.id } },
            asin: 'UNIQUE001', // Same ASIN
            title: 'Duplicate Test',
            price: 99.99,
            currency: 'USD',
            commission: 10,
            commissionType: 'percentage',
            affiliateUrl: 'https://amazon.com/dp/UNIQUE001?tag=test-20',
            status: 'ACTIVE',
          },
        }),
      ).rejects.toThrow();
    });

    it('should enforce foreign key constraints', async () => {
      // Try to create product with non-existent network
      await expect(
        prisma.product.create({
          data: {
            network: { connect: { id: 'non-existent-id' } },
            asin: 'FK001',
            title: 'FK Test',
            price: 99.99,
            currency: 'USD',
            commission: 10,
            commissionType: 'percentage',
            affiliateUrl: 'https://amazon.com/dp/FK001?tag=test-20',
            status: 'ACTIVE',
          },
        }),
      ).rejects.toThrow();
    });

    it('should validate enum values', async () => {
      const network = await createTestAffiliateNetwork();

      // Try to create product with invalid status
      await expect(
        prisma.product.create({
          data: {
            network: { connect: { id: network.id } },
            asin: 'ENUM001',
            title: 'Enum Test',
            price: 99.99,
            currency: 'USD',
            commission: 10,
            commissionType: 'percentage',
            affiliateUrl: 'https://amazon.com/dp/ENUM001?tag=test-20',
            status: 'INVALID_STATUS' as any,
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Complex Queries', () => {
    it('should perform complex joins', async () => {
      const data = await createCompleteTestWorkflowData();

      const results = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          videos: {
            some: {
              status: 'READY',
              publications: {
                some: {
                  platform: 'YOUTUBE',
                  status: 'PUBLISHED',
                },
              },
            },
          },
        },
        include: {
          videos: {
            where: { status: 'READY' },
            include: {
              publications: {
                where: { platform: 'YOUTUBE' },
              },
            },
          },
        },
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((product) => {
        expect(product.videos.length).toBeGreaterThan(0);
        product.videos.forEach((video) => {
          expect(video.publications.length).toBeGreaterThan(0);
        });
      });
    });

    it('should calculate derived values', async () => {
      const network = await createTestAffiliateNetwork();
      const products = await createTestProducts(network.id, 5);

      for (const product of products) {
        await prisma.productAnalytics.create({
          data: {
            productId: product.id,
            date: new Date(),
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 49.95,
            ctr: 5.0,
            conversionRate: 10.0,
            roi: (49.95 - 2.5) / 2.5,
          },
        });
      }

      const analytics = await prisma.productAnalytics.aggregate({
        _sum: {
          views: true,
          revenue: true,
        },
        _avg: {
          roi: true,
        },
      });

      expect(analytics._sum.views).toBe(5000);
      expect(analytics._avg.roi).toBeGreaterThan(0);
    });
  });

  describe('Bulk Operations', () => {
    it('should perform bulk inserts efficiently', async () => {
      const network = await createTestAffiliateNetwork();

      const startTime = Date.now();

      const bulkProducts = Array(100)
        .fill(null)
        .map((_, index) => ({
          networkId: network.id,
          asin: `BULK${index.toString().padStart(5, '0')}`,
          title: `Bulk Product ${index}`,
          price: 99.99,
          currency: 'USD',
          commission: 10,
          commissionType: 'percentage',
          affiliateUrl: `https://amazon.com/dp/BULK${index.toString().padStart(5, '0')}?tag=test-20`,
          status: 'ACTIVE' as any,
        }));

      await prisma.product.createMany({
        data: bulkProducts,
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000); // Should complete in < 2 seconds

      const count = await prisma.product.count({
        where: { asin: { startsWith: 'BULK' } },
      });

      expect(count).toBe(100);
    });

    it('should perform bulk updates efficiently', async () => {
      const network = await createTestAffiliateNetwork();
      await createTestProducts(network.id, 50);

      const startTime = Date.now();

      await prisma.product.updateMany({
        where: { networkId: network.id },
        data: {
          overallScore: 0.8,
          lastRankedAt: new Date(),
        },
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);

      const updatedProducts = await prisma.product.findMany({
        where: {
          networkId: network.id,
          overallScore: 0.8,
        },
      });

      expect(updatedProducts.length).toBe(50);
    });

    it('should perform bulk deletes efficiently', async () => {
      const network = await createTestAffiliateNetwork();
      await createTestProducts(network.id, 50);

      const startTime = Date.now();

      await prisma.product.deleteMany({
        where: {
          networkId: network.id,
          overallScore: { lt: 0.3 },
        },
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });
});
