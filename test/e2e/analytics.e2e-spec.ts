/**
 * E2E tests for Analytics and ROI Tracking
 * Tests analytics collection, ROI calculation, and performance metrics
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/common/database/prisma.service';
import { createMockProduct } from '../fixtures/product.fixtures';

describe('Analytics (E2E)', () => {
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
    await prisma.platformAnalytics.deleteMany({});
    await prisma.productAnalytics.deleteMany({});
    await prisma.networkAnalytics.deleteMany({});
    await prisma.publication.deleteMany({});
    await prisma.video.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.affiliateNetwork.deleteMany({});
  });

  describe('Analytics Collection', () => {
    it('should collect and aggregate analytics from all platforms', async () => {
      // Setup
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
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

      const video = await prisma.video.create({
        data: {
          productId: product.id,
          title: 'Product Review',
          script: 'Script',
          duration: 60,
          status: 'READY',
        },
      });

      // Create publications
      const youtube = await prisma.publication.create({
        data: {
          videoId: video.id,
          platform: 'YOUTUBE',
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });

      const tiktok = await prisma.publication.create({
        data: {
          videoId: video.id,
          platform: 'TIKTOK',
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });

      // Create platform analytics
      await prisma.platformAnalytics.create({
        data: {
          publicationId: youtube.id,
          date: new Date(),
          views: 10000,
          likes: 500,
          comments: 50,
          shares: 100,
          clicks: 200,
          engagement: 0.065, // (500+50+100)/10000
        },
      });

      await prisma.platformAnalytics.create({
        data: {
          publicationId: tiktok.id,
          date: new Date(),
          views: 50000,
          likes: 2500,
          comments: 250,
          shares: 500,
          clicks: 1000,
          engagement: 0.065,
        },
      });

      // Collect analytics
      const response = await request(app.getHttpServer())
        .get('/analytics/summary?days=1')
        .expect(200);

      expect(response.body.totalViews).toBe(60000); // 10k + 50k
      expect(response.body.totalClicks).toBe(1200); // 200 + 1000
      expect(response.body.platforms).toHaveLength(2);
    });

    it('should calculate ROI correctly', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({
          networkId: network.id,
          price: 200,
          commission: 10, // 10% = $20 per sale
        }),
      });

      // Create product analytics
      await prisma.productAnalytics.create({
        data: {
          productId: product.id,
          date: new Date(),
          views: 10000,
          clicks: 500, // 5% CTR
          conversions: 25, // 5% conversion rate
          revenue: 500.0, // 25 conversions * $20
          ctr: 0.05,
          conversionRate: 0.05,
          roi: 4.85, // (500 - 27) / 27 * 100 = 485% (assuming $27 cost)
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/analytics/products/${product.id}`)
        .expect(200);

      expect(response.body.totalRevenue).toBe(500.0);
      expect(response.body.totalConversions).toBe(25);
      expect(response.body.roi).toBeGreaterThan(4);
    });

    it('should track performance by platform', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({ networkId: network.id }),
      });

      const video = await prisma.video.create({
        data: {
          productId: product.id,
          title: 'Video',
          script: 'Script',
          duration: 60,
          status: 'READY',
        },
      });

      const platforms = ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'];

      for (const platform of platforms) {
        const publication = await prisma.publication.create({
          data: {
            videoId: video.id,
            platform,
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        });

        await prisma.platformAnalytics.create({
          data: {
            publicationId: publication.id,
            date: new Date(),
            views: Math.floor(Math.random() * 50000) + 1000,
            likes: Math.floor(Math.random() * 1000),
            engagement: Math.random() * 0.1,
          },
        });
      }

      const response = await request(app.getHttpServer())
        .get('/analytics/platforms/compare')
        .expect(200);

      expect(response.body.platforms).toHaveLength(3);
      expect(response.body.platforms.map((p: any) => p.platform).sort()).toEqual([
        'INSTAGRAM',
        'TIKTOK',
        'YOUTUBE',
      ]);
    });

    it('should track 7-day trends', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({ networkId: network.id }),
      });

      // Create analytics for past 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        await prisma.productAnalytics.create({
          data: {
            productId: product.id,
            date,
            views: 1000 + i * 100,
            clicks: 50 + i * 5,
            conversions: 5 + i,
            revenue: (5 + i) * 20,
            ctr: 0.05,
            conversionRate: 0.1,
            roi: 3.5,
          },
        });
      }

      const response = await request(app.getHttpServer())
        .get('/analytics/trends?days=7')
        .expect(200);

      expect(response.body.data).toHaveLength(7);
      expect(response.body.totalViews).toBeGreaterThan(0);
      expect(response.body.totalRevenue).toBeGreaterThan(0);
    });
  });

  describe('ROI Calculation', () => {
    it('should calculate ROI per product', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
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

      // Scenario: Spent $10 on content, earned $100
      await prisma.productAnalytics.create({
        data: {
          productId: product.id,
          date: new Date(),
          views: 5000,
          clicks: 250,
          conversions: 10,
          revenue: 100.0, // 10 * $10 commission
          ctr: 0.05,
          conversionRate: 0.04,
          roi: 9.0, // (100 - 10) / 10 = 900%
        },
      });

      const response = await request(app.getHttpServer())
        .post('/analytics/calculate-roi')
        .send({
          productId: product.id,
          contentCost: 10.0,
        })
        .expect(200);

      expect(response.body.roi).toBeGreaterThan(5);
      expect(response.body.netProfit).toBe(90.0);
    });

    it('should identify top performing products', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      // Create products with different ROI
      const products = await Promise.all([
        prisma.product.create({
          data: createMockProduct({
            title: 'High ROI Product',
            networkId: network.id,
          }),
        }),
        prisma.product.create({
          data: createMockProduct({
            title: 'Medium ROI Product',
            networkId: network.id,
          }),
        }),
        prisma.product.create({
          data: createMockProduct({
            title: 'Low ROI Product',
            networkId: network.id,
          }),
        }),
      ]);

      // Create analytics with different ROI
      await prisma.productAnalytics.createMany({
        data: [
          {
            productId: products[0].id,
            date: new Date(),
            views: 10000,
            clicks: 500,
            conversions: 50,
            revenue: 1000.0,
            ctr: 0.05,
            conversionRate: 0.1,
            roi: 9.0, // 900%
          },
          {
            productId: products[1].id,
            date: new Date(),
            views: 5000,
            clicks: 200,
            conversions: 20,
            revenue: 300.0,
            ctr: 0.04,
            conversionRate: 0.1,
            roi: 5.0, // 500%
          },
          {
            productId: products[2].id,
            date: new Date(),
            views: 2000,
            clicks: 50,
            conversions: 2,
            revenue: 20.0,
            ctr: 0.025,
            conversionRate: 0.04,
            roi: 0.5, // 50%
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/analytics/top-products?limit=3')
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body[0].title).toBe('High ROI Product');
      expect(response.body[0].roi).toBeGreaterThan(response.body[1].roi);
    });

    it('should identify underperforming products for optimization', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({
          networkId: network.id,
        }),
      });

      // Create poor performance analytics
      await prisma.productAnalytics.create({
        data: {
          productId: product.id,
          date: new Date(),
          views: 1000,
          clicks: 10, // Low CTR
          conversions: 0, // No conversions
          revenue: 0,
          ctr: 0.01,
          conversionRate: 0,
          roi: -1.0, // Negative ROI
        },
      });

      const response = await request(app.getHttpServer())
        .get('/analytics/underperforming?threshold=0.5')
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].id).toBe(product.id);
      expect(response.body[0].roi).toBeLessThan(0.5);
    });
  });

  describe('Network Analytics', () => {
    it('should track performance by network', async () => {
      const networks = await Promise.all([
        prisma.affiliateNetwork.create({
          data: {
            name: 'Amazon',
            commissionRate: 5.0,
            status: 'ACTIVE',
          },
        }),
        prisma.affiliateNetwork.create({
          data: {
            name: 'ShareASale',
            commissionRate: 8.0,
            status: 'ACTIVE',
          },
        }),
      ]);

      // Create network analytics
      await prisma.networkAnalytics.createMany({
        data: [
          {
            networkId: networks[0].id,
            date: new Date(),
            totalClicks: 1000,
            totalConversions: 50,
            totalRevenue: 500.0,
          },
          {
            networkId: networks[1].id,
            date: new Date(),
            totalClicks: 500,
            totalConversions: 40,
            totalRevenue: 400.0,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/analytics/networks/compare')
        .expect(200);

      expect(response.body.networks).toHaveLength(2);
      expect(response.body.networks[0]).toHaveProperty('totalRevenue');
      expect(response.body.networks[0]).toHaveProperty('conversionRate');
    });
  });

  describe('Real-time Metrics', () => {
    it('should provide real-time dashboard metrics', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({ networkId: network.id }),
      });

      await prisma.productAnalytics.create({
        data: {
          productId: product.id,
          date: new Date(),
          views: 5000,
          clicks: 250,
          conversions: 25,
          revenue: 250.0,
          ctr: 0.05,
          conversionRate: 0.1,
          roi: 8.0,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .expect(200);

      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('totalViews');
      expect(response.body).toHaveProperty('totalConversions');
      expect(response.body).toHaveProperty('avgROI');
      expect(response.body).toHaveProperty('topProducts');
      expect(response.body).toHaveProperty('platformBreakdown');
    });

    it('should update metrics with minimal latency', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .expect(200);

      const endTime = Date.now();
      const latency = endTime - startTime;

      // Should respond within 500ms
      expect(latency).toBeLessThan(500);
      expect(response.body).toBeDefined();
    });
  });

  describe('Export and Reporting', () => {
    it('should export analytics data as CSV', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({ networkId: network.id }),
      });

      await prisma.productAnalytics.create({
        data: {
          productId: product.id,
          date: new Date(),
          views: 1000,
          clicks: 50,
          conversions: 5,
          revenue: 50.0,
          ctr: 0.05,
          conversionRate: 0.1,
          roi: 4.0,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/analytics/export?format=csv&days=7')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('date,views,clicks,conversions,revenue');
    });

    it('should generate weekly performance report', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/reports/weekly')
        .expect(200);

      expect(response.body).toHaveProperty('weekStart');
      expect(response.body).toHaveProperty('weekEnd');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('topProducts');
      expect(response.body).toHaveProperty('insights');
    });
  });
});
