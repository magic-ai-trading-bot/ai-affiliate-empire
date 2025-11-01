/**
 * E2E tests for Daily Control Loop Workflow
 * Tests the complete autonomous workflow from product discovery to publishing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/common/database/prisma.service';
import { createMockProduct } from '../fixtures/product.fixtures';

describe('Daily Workflow (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.publication.deleteMany({});
    await prisma.video.deleteMany({});
    await prisma.productAnalytics.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.affiliateNetwork.deleteMany({});
  });

  describe('Complete Daily Control Loop', () => {
    it('should execute full daily workflow: sync → rank → select → generate → publish', async () => {
      // Setup: Create network
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon Associates',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      // Setup: Create initial products
      const products = await prisma.product.createMany({
        data: [
          createMockProduct({
            title: 'High Score Product',
            price: 200,
            commission: 10,
            networkId: network.id,
            overallScore: 0.9,
          }),
          createMockProduct({
            title: 'Medium Score Product',
            price: 100,
            commission: 5,
            networkId: network.id,
            overallScore: 0.6,
          }),
          createMockProduct({
            title: 'Low Score Product',
            price: 50,
            commission: 2,
            networkId: network.id,
            overallScore: 0.3,
          }),
        ],
      });

      // Step 1: Sync products (should find existing products)
      const syncResponse = await request(app.getHttpServer())
        .post('/products/sync/amazon')
        .send({ category: 'Electronics' })
        .expect(200);

      expect(syncResponse.body).toHaveProperty('synced');
      expect(syncResponse.body.synced).toBeGreaterThanOrEqual(3);

      // Step 2: Rank products
      const allProducts = await prisma.product.findMany();

      for (const product of allProducts) {
        await request(app.getHttpServer())
          .post(`/products/${product.id}/rank`)
          .expect(200);
      }

      // Verify products have been ranked
      const rankedProducts = await prisma.product.findMany({
        where: { lastRankedAt: { not: null } },
        orderBy: { overallScore: 'desc' },
      });

      expect(rankedProducts.length).toBeGreaterThan(0);

      // Step 3: Select top products
      const topProductsResponse = await request(app.getHttpServer())
        .get('/products?limit=2')
        .expect(200);

      expect(topProductsResponse.body).toHaveLength(2);
      const topProductIds = topProductsResponse.body.map((p: any) => p.id);

      // Step 4: Generate content for top products
      for (const productId of topProductIds) {
        const contentResponse = await request(app.getHttpServer())
          .post('/content/scripts/generate')
          .send({
            productId,
            language: 'en',
            tone: 'engaging',
          })
          .expect(201);

        expect(contentResponse.body).toHaveProperty('script');
        expect(contentResponse.body).toHaveProperty('videoId');
      }

      // Verify videos were created
      const videos = await prisma.video.findMany({
        where: { productId: { in: topProductIds } },
      });

      expect(videos.length).toBe(2);

      // Step 5: Generate videos (voice + visuals)
      for (const video of videos) {
        const videoResponse = await request(app.getHttpServer())
          .post('/video/generate')
          .send({
            videoId: video.id,
            voiceProvider: 'elevenlabs',
          })
          .expect(202);

        expect(videoResponse.body).toHaveProperty('status');
      }

      // Step 6: Publish to platforms
      const readyVideos = await prisma.video.findMany({
        where: { status: 'READY' },
      });

      for (const video of readyVideos) {
        // Publish to YouTube
        await request(app.getHttpServer())
          .post('/publisher/publish')
          .send({
            videoId: video.id,
            platform: 'YOUTUBE',
            title: `Product Review: ${video.title}`,
            tags: ['review', 'affiliate'],
          })
          .expect(201);

        // Publish to TikTok
        await request(app.getHttpServer())
          .post('/publisher/publish')
          .send({
            videoId: video.id,
            platform: 'TIKTOK',
            caption: `Check this out! #review #product`,
          })
          .expect(201);
      }

      // Verify publications were created
      const publications = await prisma.publication.findMany({
        where: { videoId: { in: readyVideos.map((v) => v.id) } },
      });

      expect(publications.length).toBeGreaterThanOrEqual(2); // At least 2 platforms

      // Step 7: Collect analytics
      const analyticsResponse = await request(app.getHttpServer())
        .get('/analytics/summary?days=1')
        .expect(200);

      expect(analyticsResponse.body).toHaveProperty('totalRevenue');
      expect(analyticsResponse.body).toHaveProperty('totalViews');
      expect(analyticsResponse.body).toHaveProperty('totalConversions');

      // Step 8: Optimize strategy
      const optimizeResponse = await request(app.getHttpServer())
        .post('/optimizer/optimize')
        .send({
          minROI: 1.5,
          killThreshold: 0.5,
          scaleThreshold: 2.0,
        })
        .expect(200);

      expect(optimizeResponse.body).toHaveProperty('killed');
      expect(optimizeResponse.body).toHaveProperty('scaled');
    }, 120000); // 2 minute timeout for full workflow

    it('should handle workflow failure and recovery', async () => {
      // Create network and product
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Test Network',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({
          title: 'Test Product',
          networkId: network.id,
        }),
      });

      // Try to generate content for invalid product
      await request(app.getHttpServer())
        .post('/content/scripts/generate')
        .send({
          productId: 'invalid-id',
          language: 'en',
        })
        .expect(404);

      // Should succeed with valid product
      await request(app.getHttpServer())
        .post('/content/scripts/generate')
        .send({
          productId: product.id,
          language: 'en',
        })
        .expect(201);
    });

    it('should process multiple products in parallel', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Test Network',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      // Create 5 products
      const productPromises = Array.from({ length: 5 }, (_, i) =>
        prisma.product.create({
          data: createMockProduct({
            title: `Product ${i + 1}`,
            networkId: network.id,
            overallScore: 0.8,
          }),
        }),
      );

      const createdProducts = await Promise.all(productPromises);

      // Generate content for all products in parallel
      const contentPromises = createdProducts.map((product) =>
        request(app.getHttpServer())
          .post('/content/scripts/generate')
          .send({
            productId: product.id,
            language: 'en',
          }),
      );

      const responses = await Promise.all(contentPromises);

      // Verify all succeeded
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('script');
      });

      // Verify all videos were created
      const videos = await prisma.video.findMany({
        where: { productId: { in: createdProducts.map((p) => p.id) } },
      });

      expect(videos.length).toBe(5);
    });

    it('should respect platform-specific publishing rules', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Test Network',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({
          networkId: network.id,
        }),
      });

      // Create video
      const video = await prisma.video.create({
        data: {
          productId: product.id,
          title: 'Test Video',
          script: 'Test script',
          duration: 60,
          status: 'READY',
        },
      });

      // YouTube: requires title and description
      const youtubeResponse = await request(app.getHttpServer())
        .post('/publisher/publish')
        .send({
          videoId: video.id,
          platform: 'YOUTUBE',
          title: 'Product Review',
          description: 'Check out this amazing product!',
        })
        .expect(201);

      expect(youtubeResponse.body.platform).toBe('YOUTUBE');

      // TikTok: requires caption
      const tiktokResponse = await request(app.getHttpServer())
        .post('/publisher/publish')
        .send({
          videoId: video.id,
          platform: 'TIKTOK',
          caption: 'Amazing product! #review',
        })
        .expect(201);

      expect(tiktokResponse.body.platform).toBe('TIKTOK');

      // Instagram: requires caption
      const instagramResponse = await request(app.getHttpServer())
        .post('/publisher/publish')
        .send({
          videoId: video.id,
          platform: 'INSTAGRAM',
          caption: 'Must-have product! #affiliate',
        })
        .expect(201);

      expect(instagramResponse.body.platform).toBe('INSTAGRAM');
    });
  });

  describe('Analytics and Optimization', () => {
    it('should track performance metrics correctly', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Test Network',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({
          networkId: network.id,
          price: 100,
          commission: 10,
        }),
      });

      // Create product analytics
      await prisma.productAnalytics.create({
        data: {
          productId: product.id,
          date: new Date(),
          views: 1000,
          clicks: 100,
          conversions: 10,
          revenue: 100.0, // 10 conversions * $10 commission
          ctr: 0.1, // 100/1000
          conversionRate: 0.1, // 10/100
          roi: 10.0, // (100 - 10) / 10 (assuming $10 cost)
        },
      });

      // Get analytics summary
      const response = await request(app.getHttpServer())
        .get('/analytics/summary?days=1')
        .expect(200);

      expect(response.body.totalRevenue).toBeGreaterThan(0);
      expect(response.body.totalViews).toBe(1000);
      expect(response.body.totalConversions).toBe(10);
    });

    it('should optimize strategy based on ROI thresholds', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Test Network',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      // Create high performer
      const highPerformer = await prisma.product.create({
        data: createMockProduct({
          title: 'High Performer',
          networkId: network.id,
          overallScore: 0.9,
          status: 'ACTIVE',
        }),
      });

      // Create low performer
      const lowPerformer = await prisma.product.create({
        data: createMockProduct({
          title: 'Low Performer',
          networkId: network.id,
          overallScore: 0.2,
          status: 'ACTIVE',
        }),
      });

      // Optimize with threshold of 0.5
      const response = await request(app.getHttpServer())
        .post('/optimizer/optimize')
        .send({
          minROI: 1.5,
          killThreshold: 0.5,
          scaleThreshold: 2.0,
        })
        .expect(200);

      expect(response.body).toHaveProperty('killed');
      expect(response.body).toHaveProperty('scaled');

      // Verify low performer was archived
      const updatedLowPerformer = await prisma.product.findUnique({
        where: { id: lowPerformer.id },
      });

      expect(updatedLowPerformer?.status).toBe('ARCHIVED');

      // High performer should still be active
      const updatedHighPerformer = await prisma.product.findUnique({
        where: { id: highPerformer.id },
      });

      expect(updatedHighPerformer?.status).toBe('ACTIVE');
    });
  });
});
