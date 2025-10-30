/**
 * Unit tests for ROICalculator service
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ROICalculatorService } from '@/modules/analytics/services/roi-calculator.service';
import { PrismaService } from '@/common/database/prisma.service';
import { MockPrismaService, mockPrismaService } from '../../mocks/prisma.mock';
import { createMockAnalyticsArray, createMockNetworkAnalytics } from '../../fixtures/analytics.fixtures';

describe('ROICalculatorService', () => {
  let service: ROICalculatorService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ROICalculatorService,
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ROICalculatorService>(ROICalculatorService);
    prisma = module.get<MockPrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateProductROI', () => {
    it('should calculate ROI correctly for product with revenue', () => {
      const product = {
        id: 'prod1',
        analytics: [
          { revenue: 100 },
          { revenue: 150 },
          { revenue: 50 },
        ],
        videos: [{ id: 'v1' }, { id: 'v2' }],
      };

      const roi = service.calculateProductROI(product);

      // Total revenue: 300
      // Cost for 2 videos: 2 * (0.02 + 0.014 + 0.01 + 0.04) = 2 * 0.084 = 0.168
      // ROI: (300 - 0.168) / 0.168 * 100 = 178,471%
      expect(roi).toBeGreaterThan(100000);
    });

    it('should handle product with no analytics', () => {
      const product = {
        id: 'prod1',
        analytics: [],
        videos: [{ id: 'v1' }],
      };

      const roi = service.calculateProductROI(product);

      // No revenue, but has cost
      // ROI: (0 - cost) / cost * 100 = -100%
      expect(roi).toBe(-100);
    });

    it('should handle product with no videos', () => {
      const product = {
        id: 'prod1',
        analytics: [{ revenue: 100 }],
        videos: [],
      };

      const roi = service.calculateProductROI(product);

      // No cost (0 videos)
      expect(roi).toBe(0);
    });

    it('should handle product with undefined analytics', () => {
      const product = {
        id: 'prod1',
        videos: [{ id: 'v1' }],
      };

      const roi = service.calculateProductROI(product);

      expect(roi).toBe(-100);
    });

    it('should handle decimal revenue values', () => {
      const product = {
        id: 'prod1',
        analytics: [
          { revenue: 10.50 },
          { revenue: 20.75 },
        ],
        videos: [{ id: 'v1' }],
      };

      const roi = service.calculateProductROI(product);

      // Total revenue: 31.25
      expect(roi).toBeGreaterThan(0);
    });
  });

  describe('calculateSystemROI', () => {
    it('should calculate system-wide ROI with all metrics', async () => {
      // Mock data
      mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
        _sum: { revenue: 5000 },
      });

      mockPrismaService.video.count.mockResolvedValue(100);
      mockPrismaService.blog.count.mockResolvedValue(20);

      mockPrismaService.affiliateNetwork.findMany.mockResolvedValue([
        {
          name: 'Amazon Associates',
          analytics: [
            { totalRevenue: 3000 },
            { totalRevenue: 1000 },
          ],
        },
        {
          name: 'ShareASale',
          analytics: [
            { totalRevenue: 1000 },
          ],
        },
      ]);

      const result = await service.calculateSystemROI();

      expect(result).toHaveProperty('revenue');
      expect(result).toHaveProperty('costs');
      expect(result).toHaveProperty('roi');
      expect(result).toHaveProperty('content');

      expect(result.revenue.total).toBe(5000);
      expect(result.content.videos).toBe(100);
      expect(result.content.blogs).toBe(20);
    });

    it('should calculate correct cost breakdown', async () => {
      mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
        _sum: { revenue: 1000 },
      });

      mockPrismaService.video.count.mockResolvedValue(50);
      mockPrismaService.blog.count.mockResolvedValue(10);

      mockPrismaService.affiliateNetwork.findMany.mockResolvedValue([]);

      const result = await service.calculateSystemROI();

      // Fixed costs: 86
      expect(result.costs.fixed).toBe(86);

      // Variable costs for 50 videos + 10 blogs
      // Videos: 50 * (0.02 + 0.014 + 0.01 + 0.04) = 50 * 0.084 = 4.2
      // Blogs: 10 * 0.05 = 0.5
      // Total variable: 4.7
      expect(result.costs.variable).toBeCloseTo(4.7, 1);

      // Total cost: 86 + 4.7 = 90.7
      expect(result.costs.total).toBeCloseTo(90.7, 1);
    });

    it('should calculate ROI percentage correctly', async () => {
      mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
        _sum: { revenue: 1000 },
      });

      mockPrismaService.video.count.mockResolvedValue(10);
      mockPrismaService.blog.count.mockResolvedValue(0);

      mockPrismaService.affiliateNetwork.findMany.mockResolvedValue([]);

      const result = await service.calculateSystemROI();

      // Revenue: 1000
      // Cost: 86 + (10 * 0.084) = 86 + 0.84 = 86.84
      // ROI: (1000 - 86.84) / 86.84 * 100 = 1051.7%
      expect(result.roi.percentage).toBeGreaterThan(1000);
      expect(result.roi.profit).toBeGreaterThan(900);
    });

    it('should handle zero revenue', async () => {
      mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
        _sum: { revenue: null },
      });

      mockPrismaService.video.count.mockResolvedValue(10);
      mockPrismaService.blog.count.mockResolvedValue(0);

      mockPrismaService.affiliateNetwork.findMany.mockResolvedValue([]);

      const result = await service.calculateSystemROI();

      expect(result.revenue.total).toBe(0);
      expect(result.roi.percentage).toBeLessThan(0);
    });

    it('should calculate average revenue per video', async () => {
      mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
        _sum: { revenue: 500 },
      });

      mockPrismaService.video.count.mockResolvedValue(100);
      mockPrismaService.blog.count.mockResolvedValue(0);

      mockPrismaService.affiliateNetwork.findMany.mockResolvedValue([]);

      const result = await service.calculateSystemROI();

      // 500 / 100 = 5
      expect(result.content.avgRevenuePerVideo).toBe(5);
    });

    it('should handle no videos gracefully', async () => {
      mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
        _sum: { revenue: 100 },
      });

      mockPrismaService.video.count.mockResolvedValue(0);
      mockPrismaService.blog.count.mockResolvedValue(0);

      mockPrismaService.affiliateNetwork.findMany.mockResolvedValue([]);

      const result = await service.calculateSystemROI();

      expect(result.content.videos).toBe(0);
      expect(result.content.avgRevenuePerVideo).toBe(0);
    });

    it('should include revenue breakdown by network', async () => {
      mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
        _sum: { revenue: 5000 },
      });

      mockPrismaService.video.count.mockResolvedValue(100);
      mockPrismaService.blog.count.mockResolvedValue(0);

      mockPrismaService.affiliateNetwork.findMany.mockResolvedValue([
        {
          name: 'Amazon Associates',
          analytics: [
            { totalRevenue: 3000 },
          ],
        },
        {
          name: 'ShareASale',
          analytics: [
            { totalRevenue: 2000 },
          ],
        },
      ]);

      const result = await service.calculateSystemROI();

      expect(result.revenue.breakdown).toHaveLength(2);
      expect(result.revenue.breakdown[0]).toEqual({
        network: 'Amazon Associates',
        revenue: 3000,
      });
      expect(result.revenue.breakdown[1]).toEqual({
        network: 'ShareASale',
        revenue: 2000,
      });
    });
  });

  describe('cost calculations', () => {
    it('should calculate correct cost per video', async () => {
      mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
        _sum: { revenue: 100 },
      });

      mockPrismaService.video.count.mockResolvedValue(1);
      mockPrismaService.blog.count.mockResolvedValue(0);

      mockPrismaService.affiliateNetwork.findMany.mockResolvedValue([]);

      const result = await service.calculateSystemROI();

      // Cost per video: 0.02 + 0.014 + 0.01 + 0.04 = 0.084
      expect(result.content.avgCostPerVideo).toBeCloseTo(0.084, 3);
    });

    it('should include fixed costs in total', async () => {
      mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
        _sum: { revenue: 100 },
      });

      mockPrismaService.video.count.mockResolvedValue(0);
      mockPrismaService.blog.count.mockResolvedValue(0);

      mockPrismaService.affiliateNetwork.findMany.mockResolvedValue([]);

      const result = await service.calculateSystemROI();

      // With no content, should still have fixed costs
      expect(result.costs.total).toBe(86);
      expect(result.costs.breakdown.fixed).toEqual({
        hosting: 30,
        pikaLabs: 28,
        elevenLabs: 28,
      });
    });

    it('should calculate blog costs correctly', async () => {
      mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
        _sum: { revenue: 100 },
      });

      mockPrismaService.video.count.mockResolvedValue(0);
      mockPrismaService.blog.count.mockResolvedValue(20);

      mockPrismaService.affiliateNetwork.findMany.mockResolvedValue([]);

      const result = await service.calculateSystemROI();

      // Blog cost: 20 * 0.05 = 1.0
      expect(result.costs.breakdown.variable.blogs).toBe(1.0);
    });
  });

  describe('edge cases', () => {
    it('should handle very large numbers', async () => {
      mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
        _sum: { revenue: 1000000 },
      });

      mockPrismaService.video.count.mockResolvedValue(10000);
      mockPrismaService.blog.count.mockResolvedValue(5000);

      mockPrismaService.affiliateNetwork.findMany.mockResolvedValue([]);

      const result = await service.calculateSystemROI();

      expect(result.revenue.total).toBe(1000000);
      expect(result.roi.percentage).toBeGreaterThan(0);
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaService.productAnalytics.aggregate.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.calculateSystemROI()).rejects.toThrow('Database error');
    });

    it('should handle null values in aggregation', async () => {
      mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
        _sum: { revenue: null },
      });

      mockPrismaService.video.count.mockResolvedValue(10);
      mockPrismaService.blog.count.mockResolvedValue(0);

      mockPrismaService.affiliateNetwork.findMany.mockResolvedValue([]);

      const result = await service.calculateSystemROI();

      expect(result.revenue.total).toBe(0);
    });
  });
});
