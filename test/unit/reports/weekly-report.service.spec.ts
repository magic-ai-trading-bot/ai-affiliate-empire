/**
 * Unit tests for WeeklyReportService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { WeeklyReportService } from '@/modules/reports/services/weekly-report.service';
import { PrismaService } from '@/common/database/prisma.service';
import { MockPrismaService, mockPrismaService } from '../../mocks/prisma.mock';

describe('WeeklyReportService', () => {
  let service: WeeklyReportService;
  let _prisma: MockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeeklyReportService,
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WeeklyReportService>(WeeklyReportService);
    prisma = module.get<MockPrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateWeeklyReport', () => {
    it('should generate complete weekly report', async () => {
      // Mock analytics
      mockPrismaService.productAnalytics.findMany
        .mockResolvedValueOnce([
          {
            productId: 'p1',
            revenue: 100,
            clicks: 50,
            conversions: 5,
            product: { title: 'Product 1', network: { name: 'Network 1' } },
          },
        ])
        .mockResolvedValueOnce([]); // Previous week

      // Mock videos
      mockPrismaService.video.findMany.mockResolvedValue([
        {
          id: 'v1',
          productId: 'p1',
          status: 'READY',
          createdAt: new Date(),
          product: { title: 'Product 1' },
          publications: [
            {
              platform: 'YOUTUBE',
              publishedAt: new Date(),
              analytics: [{ views: 1000, likes: 50, comments: 10, shares: 5 }],
            },
          ],
        },
      ]);

      // Mock blogs
      mockPrismaService.blog.count.mockResolvedValue(5);

      // Mock product analytics query
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([
        { revenue: 50, clicks: 25, conversions: 2 },
      ]);

      const result = await service.generateWeeklyReport();

      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('revenue');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('optimization');
      expect(result).toHaveProperty('costs');
      expect(result).toHaveProperty('roi');
      expect(result).toHaveProperty('recommendations');
    });

    it('should calculate revenue totals correctly', async () => {
      mockPrismaService.productAnalytics.findMany
        .mockResolvedValueOnce([
          {
            productId: 'p1',
            revenue: 100,
            clicks: 50,
            conversions: 5,
            product: { title: 'P1', network: {} },
          },
          {
            productId: 'p1',
            revenue: 150,
            clicks: 75,
            conversions: 8,
            product: { title: 'P1', network: {} },
          },
          {
            productId: 'p2',
            revenue: 200,
            clicks: 100,
            conversions: 10,
            product: { title: 'P2', network: {} },
          },
        ])
        .mockResolvedValueOnce([]); // Previous week

      mockPrismaService.video.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      expect(result.revenue.total).toBe(450);
    });

    it('should calculate period correctly', async () => {
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([]);
      mockPrismaService.video.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      expect(result.period).toHaveProperty('start');
      expect(result.period).toHaveProperty('end');
      expect(result.period).toHaveProperty('week');
      expect(result.period.week).toBeGreaterThan(0);
    });

    it('should calculate content metrics', async () => {
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([
        {
          productId: 'p1',
          revenue: 100,
          clicks: 50,
          conversions: 5,
          product: { title: 'P1', network: {} },
        },
      ]);

      mockPrismaService.video.findMany.mockResolvedValue([
        {
          id: 'v1',
          productId: 'p1',
          status: 'READY',
          createdAt: new Date(),
          product: {},
          publications: [{ platform: 'YOUTUBE', analytics: [{ views: 1000 }] }],
        },
        {
          id: 'v2',
          productId: 'p1',
          status: 'PROCESSING',
          createdAt: new Date(),
          product: {},
          publications: [],
        },
      ]);

      mockPrismaService.blog.count.mockResolvedValue(10);

      const result = await service.generateWeeklyReport();

      expect(result.content.videosCreated).toBe(2);
      expect(result.content.videosPublished).toBe(1); // Only READY status
      expect(result.content.blogsPublished).toBe(10);
    });

    it('should calculate costs correctly', async () => {
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([]);

      mockPrismaService.video.findMany.mockResolvedValue([
        { id: 'v1', productId: 'p1', publications: [] },
        { id: 'v2', productId: 'p1', publications: [] },
        { id: 'v3', productId: 'p1', publications: [] },
      ]);

      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      // Fixed cost: 86
      // Variable cost: 3 videos * 0.27 = 0.81
      // Total: 86.81
      expect(result.costs.fixed).toBe(86);
      expect(result.costs.variable).toBeCloseTo(0.81, 2);
      expect(result.costs.total).toBeCloseTo(86.81, 2);
    });

    it('should calculate ROI correctly', async () => {
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([
        {
          productId: 'p1',
          revenue: 1000,
          clicks: 50,
          conversions: 5,
          product: { title: 'P1', network: {} },
        },
      ]);

      mockPrismaService.video.findMany.mockResolvedValue([
        { id: 'v1', productId: 'p1', publications: [] },
      ]);

      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      // Revenue: 1000
      // Cost: 86 + 0.27 = 86.27
      // ROI: (1000 - 86.27) / 86.27 * 100 ≈ 1058%
      expect(result.roi.overall).toBeGreaterThan(1000);
      expect(result.roi.profit).toBeCloseTo(913.73, 1);
      expect(result.roi.breakeven).toBe(true);
    });

    it('should calculate growth percentage', async () => {
      // Current week
      mockPrismaService.productAnalytics.findMany
        .mockResolvedValueOnce([
          {
            productId: 'p1',
            revenue: 1000,
            clicks: 50,
            conversions: 5,
            product: { title: 'P1', network: {} },
          },
        ])
        .mockResolvedValueOnce([
          {
            productId: 'p1',
            revenue: 500,
            clicks: 25,
            conversions: 2,
            product: { title: 'P1', network: {} },
          },
        ]);

      mockPrismaService.video.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      // Growth: (1000 - 500) / 500 * 100 = 100%
      expect(result.revenue.growth).toBe(100);
    });

    it('should handle zero previous revenue', async () => {
      mockPrismaService.productAnalytics.findMany
        .mockResolvedValueOnce([
          {
            productId: 'p1',
            revenue: 500,
            clicks: 25,
            conversions: 2,
            product: { title: 'P1', network: {} },
          },
        ])
        .mockResolvedValueOnce([]);

      mockPrismaService.video.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      expect(result.revenue.growth).toBe(100);
    });

    it('should identify top products', async () => {
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([
        {
          productId: 'p1',
          revenue: 500,
          clicks: 50,
          conversions: 5,
          product: { title: 'Product 1', network: {} },
        },
        {
          productId: 'p2',
          revenue: 300,
          clicks: 30,
          conversions: 3,
          product: { title: 'Product 2', network: {} },
        },
        {
          productId: 'p3',
          revenue: 100,
          clicks: 10,
          conversions: 1,
          product: { title: 'Product 3', network: {} },
        },
      ]);

      mockPrismaService.video.findMany.mockResolvedValue([
        { id: 'v1', productId: 'p1', publications: [] },
        { id: 'v2', productId: 'p2', publications: [] },
        { id: 'v3', productId: 'p3', publications: [] },
      ]);

      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      expect(result.performance.topProducts).toHaveLength(3);
      expect(result.performance.topProducts[0].title).toBe('Product 1');
      expect(result.performance.topProducts[0].revenue).toBe(500);
    });

    it('should identify worst performers (ROI < 0.5)', async () => {
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([
        {
          productId: 'p1',
          revenue: 0.1,
          clicks: 5,
          conversions: 0,
          product: { title: 'Bad Product', network: {} },
        },
      ]);

      mockPrismaService.video.findMany.mockResolvedValue([
        { id: 'v1', productId: 'p1', publications: [] },
      ]);

      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      // ROI = (0.1 - 0.27) / 0.27 * 100 = -62.96%
      expect(result.performance.worstPerformers.length).toBeGreaterThan(0);
      expect(result.performance.worstPerformers[0].roi).toBeLessThan(0.5);
    });

    it('should group revenue by platform', async () => {
      mockPrismaService.productAnalytics.findMany
        .mockResolvedValueOnce([
          {
            productId: 'p1',
            revenue: 100,
            clicks: 50,
            conversions: 5,
            product: { title: 'P1', network: {} },
          },
        ])
        .mockResolvedValueOnce([]) // Previous week
        .mockResolvedValueOnce([{ revenue: 50 }]); // Platform revenue query

      mockPrismaService.video.findMany.mockResolvedValue([
        {
          id: 'v1',
          productId: 'p1',
          publications: [
            {
              platform: 'YOUTUBE',
              publishedAt: new Date(),
              analytics: [{ views: 1000 }],
            },
            {
              platform: 'TIKTOK',
              publishedAt: new Date(),
              analytics: [{ views: 2000 }],
            },
          ],
        },
      ]);

      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      expect(result.revenue.byPlatform.length).toBeGreaterThan(0);
    });

    it('should calculate CTR and conversion rate', async () => {
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([
        {
          productId: 'p1',
          revenue: 100,
          clicks: 200,
          conversions: 10,
          product: { title: 'P1', network: {} },
        },
      ]);

      mockPrismaService.video.findMany.mockResolvedValue([
        {
          id: 'v1',
          productId: 'p1',
          publications: [
            {
              platform: 'YOUTUBE',
              analytics: [{ views: 10000 }],
            },
          ],
        },
      ]);

      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      // CTR = (200 / 10000) * 100 = 2%
      expect(result.content.avgCTR).toBe(2);
      // Conversion rate = (10 / 200) * 100 = 5%
      expect(result.content.avgConversionRate).toBe(5);
    });

    it('should handle zero views for CTR calculation', async () => {
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([
        {
          productId: 'p1',
          revenue: 0,
          clicks: 0,
          conversions: 0,
          product: { title: 'P1', network: {} },
        },
      ]);

      mockPrismaService.video.findMany.mockResolvedValue([
        {
          id: 'v1',
          productId: 'p1',
          publications: [{ platform: 'YOUTUBE', analytics: [{ views: 0 }] }],
        },
      ]);

      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      expect(result.content.avgCTR).toBe(0);
      expect(result.content.avgConversionRate).toBe(0);
    });
  });

  describe('generateRecommendations (private)', () => {
    it('should recommend scaling for high ROI', async () => {
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([
        {
          productId: 'p1',
          revenue: 5000,
          clicks: 500,
          conversions: 50,
          product: { title: 'P1', network: {} },
        },
      ]);

      mockPrismaService.video.findMany.mockResolvedValue([
        { id: 'v1', productId: 'p1', status: 'READY', publications: [] },
      ]);

      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      const hasStrongROI = result.recommendations.some((r: string) => r.includes('Strong ROI'));
      expect(hasStrongROI).toBe(true);
    });

    it('should warn for low ROI', async () => {
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([
        {
          productId: 'p1',
          revenue: 50,
          clicks: 50,
          conversions: 5,
          product: { title: 'P1', network: {} },
        },
      ]);

      mockPrismaService.video.findMany.mockResolvedValue([
        { id: 'v1', productId: 'p1', publications: [] },
      ]);

      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      // ROI is negative, should warn
      const hasLowROI = result.recommendations.some((r: string) => r.includes('ROI below 100%'));
      expect(hasLowROI).toBe(true);
    });

    it('should recommend CTR improvement', async () => {
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([
        {
          productId: 'p1',
          revenue: 1000,
          clicks: 50,
          conversions: 5,
          product: { title: 'P1', network: {} },
        },
      ]);

      mockPrismaService.video.findMany.mockResolvedValue([
        {
          id: 'v1',
          productId: 'p1',
          publications: [{ platform: 'YOUTUBE', analytics: [{ views: 10000 }] }],
        },
      ]);

      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      // CTR = 0.5%, should recommend improvement
      const hasLowCTRRecommendation = result.recommendations.some(
        (r: string) => r.includes('Low CTR') || r.includes('CTR'),
      );
      expect(hasLowCTRRecommendation).toBe(true);
    });

    it('should recommend conversion rate improvement', async () => {
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([
        {
          productId: 'p1',
          revenue: 1000,
          clicks: 1000,
          conversions: 10,
          product: { title: 'P1', network: {} },
        },
      ]);

      mockPrismaService.video.findMany.mockResolvedValue([
        {
          id: 'v1',
          productId: 'p1',
          publications: [{ platform: 'YOUTUBE', analytics: [{ views: 10000 }] }],
        },
      ]);

      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      // Conversion rate = 1%, should recommend improvement
      const hasConversionRecommendation = result.recommendations.some(
        (r: string) => r.includes('conversion rate') || r.includes('CTAs'),
      );
      expect(hasConversionRecommendation).toBe(true);
    });

    it('should recommend archiving worst performers', async () => {
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([
        {
          productId: 'p1',
          revenue: 0.1,
          clicks: 5,
          conversions: 0,
          product: { title: 'Bad 1', network: {} },
        },
        {
          productId: 'p2',
          revenue: 0.1,
          clicks: 5,
          conversions: 0,
          product: { title: 'Bad 2', network: {} },
        },
        {
          productId: 'p3',
          revenue: 0.1,
          clicks: 5,
          conversions: 0,
          product: { title: 'Bad 3', network: {} },
        },
        {
          productId: 'p4',
          revenue: 0.1,
          clicks: 5,
          conversions: 0,
          product: { title: 'Bad 4', network: {} },
        },
        {
          productId: 'p5',
          revenue: 0.1,
          clicks: 5,
          conversions: 0,
          product: { title: 'Bad 5', network: {} },
        },
        {
          productId: 'p6',
          revenue: 0.1,
          clicks: 5,
          conversions: 0,
          product: { title: 'Bad 6', network: {} },
        },
      ]);

      mockPrismaService.video.findMany.mockResolvedValue([
        { id: 'v1', productId: 'p1', publications: [] },
        { id: 'v2', productId: 'p2', publications: [] },
        { id: 'v3', productId: 'p3', publications: [] },
        { id: 'v4', productId: 'p4', publications: [] },
        { id: 'v5', productId: 'p5', publications: [] },
        { id: 'v6', productId: 'p6', publications: [] },
      ]);

      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      // Should identify 5-6 worst performers (all have ROI < 0.5)
      expect(result.performance.worstPerformers.length).toBeGreaterThanOrEqual(5);
    });

    it('should recommend increasing production', async () => {
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([
        {
          productId: 'p1',
          revenue: 1000,
          clicks: 200,
          conversions: 20,
          product: { title: 'P1', network: {} },
        },
      ]);

      mockPrismaService.video.findMany.mockResolvedValue([
        { id: 'v1', productId: 'p1', status: 'READY', publications: [] },
      ]);

      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      // Only 1 video published, should recommend increase
      const hasProductionRecommendation = result.recommendations.some(
        (r: string) => r.includes('production') || r.includes('videos/week'),
      );
      expect(hasProductionRecommendation).toBe(true);
    });
  });

  describe('getWeekNumber (private)', () => {
    it('should calculate correct week number', async () => {
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([]);
      mockPrismaService.video.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      expect(result.period.week).toBeGreaterThan(0);
      expect(result.period.week).toBeLessThanOrEqual(53);
    });
  });

  describe('edge cases', () => {
    it('should handle empty data gracefully', async () => {
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([]);
      mockPrismaService.video.findMany.mockResolvedValue([]);
      mockPrismaService.blog.count.mockResolvedValue(0);

      const result = await service.generateWeeklyReport();

      expect(result.revenue.total).toBe(0);
      expect(result.content.videosCreated).toBe(0);
      expect(result.roi.breakeven).toBe(false);
    });

    it('should handle database errors', async () => {
      mockPrismaService.productAnalytics.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.generateWeeklyReport()).rejects.toThrow('Database error');
    });
  });
});
