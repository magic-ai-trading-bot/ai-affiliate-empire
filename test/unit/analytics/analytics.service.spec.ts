/**
 * Unit tests for AnalyticsService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '@/modules/analytics/analytics.service';
import { PrismaService } from '@/common/database/prisma.service';
import { MetricsCollectorService } from '@/modules/analytics/services/metrics-collector.service';
import { ROICalculatorService } from '@/modules/analytics/services/roi-calculator.service';
import { PerformanceAnalyzerService } from '@/modules/analytics/services/performance-analyzer.service';
import { MockPrismaService, mockPrismaService } from '../../mocks/prisma.mock';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let _prisma: MockPrismaService;
  let metricsCollector: MetricsCollectorService;
  let roiCalculator: ROICalculatorService;
  let performanceAnalyzer: PerformanceAnalyzerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
        {
          provide: MetricsCollectorService,
          useValue: {
            collectAll: jest
              .fn()
              .mockResolvedValue({ collected: 10, platforms: ['YOUTUBE', 'TIKTOK'] }),
          },
        },
        {
          provide: ROICalculatorService,
          useValue: {
            calculateProductROI: jest.fn().mockReturnValue(150),
            calculateSystemROI: jest.fn().mockResolvedValue({
              revenue: { total: 5000 },
              costs: { total: 500 },
              roi: { percentage: 900 },
            }),
          },
        },
        {
          provide: PerformanceAnalyzerService,
          useValue: {
            analyzeProduct: jest.fn().mockReturnValue({
              product: { id: 'p1' },
              performance: { revenue: 100 },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get<MockPrismaService>(PrismaService);
    metricsCollector = module.get<MetricsCollectorService>(MetricsCollectorService);
    roiCalculator = module.get<ROICalculatorService>(ROICalculatorService);
    performanceAnalyzer = module.get<PerformanceAnalyzerService>(PerformanceAnalyzerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardOverview', () => {
    it('should return complete dashboard overview with all metrics', async () => {
      mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
        _sum: { revenue: 1000 },
      });
      mockPrismaService.product.count.mockResolvedValue(25);
      mockPrismaService.video.count.mockResolvedValue(150);
      mockPrismaService.publication.count.mockResolvedValue(300);
      mockPrismaService.productAnalytics.findMany.mockResolvedValueOnce([
        { revenue: 100, date: new Date() },
        { revenue: 150, date: new Date() },
      ]);

      // Mock for getTopProducts
      mockPrismaService.product.findMany.mockResolvedValue([
        { id: 'p1', title: 'Product 1', overallScore: 0.9, price: 100, commission: 10 },
      ]);
      mockPrismaService.productAnalytics.groupBy.mockResolvedValue([
        { productId: 'p1', _sum: { revenue: 500, clicks: 100, conversions: 5 } },
      ]);

      const result = await service.getDashboardOverview();

      expect(result).toHaveProperty('revenue');
      expect(result).toHaveProperty('products');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('timestamp');
      expect(result.revenue.total).toBe(1000);
      expect(result.products.active).toBe(25);
      expect(result.content.videosReady).toBe(150);
      expect(result.content.published).toBe(300);
    });

    it('should handle zero products scenario', async () => {
      mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
        _sum: { revenue: 0 },
      });
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.video.count.mockResolvedValue(0);
      mockPrismaService.publication.count.mockResolvedValue(0);
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([]);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const result = await service.getDashboardOverview();

      expect(result.revenue.total).toBe(0);
      expect(result.products.active).toBe(0);
      expect(result.products.topPerformers).toHaveLength(0);
    });

    it('should calculate growth correctly', async () => {
      mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
        _sum: { revenue: 1000 },
      });
      mockPrismaService.product.count.mockResolvedValue(10);
      mockPrismaService.video.count.mockResolvedValue(50);
      mockPrismaService.publication.count.mockResolvedValue(100);

      // Recent analytics with growth pattern
      const today = new Date();
      mockPrismaService.productAnalytics.findMany.mockResolvedValueOnce([
        { revenue: 200, date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000) },
        { revenue: 180, date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000) },
        { revenue: 100, date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000) },
        { revenue: 80, date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000) },
      ]);

      mockPrismaService.product.findMany.mockResolvedValue([]);

      const result = await service.getDashboardOverview();

      expect(result.revenue.growth).toBeGreaterThan(0);
    });

    it('should include timestamp in ISO format', async () => {
      mockPrismaService.productAnalytics.aggregate.mockResolvedValue({ _sum: { revenue: 100 } });
      mockPrismaService.product.count.mockResolvedValue(5);
      mockPrismaService.video.count.mockResolvedValue(10);
      mockPrismaService.publication.count.mockResolvedValue(20);
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([]);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const result = await service.getDashboardOverview();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('getRevenueAnalytics', () => {
    it('should return revenue analytics for specified period', async () => {
      const mockAnalytics = [
        { date: new Date('2024-01-01'), revenue: 100, clicks: 50, conversions: 5 },
        { date: new Date('2024-01-02'), revenue: 150, clicks: 75, conversions: 8 },
        { date: new Date('2024-01-03'), revenue: 200, clicks: 100, conversions: 10 },
      ];

      mockPrismaService.productAnalytics.findMany.mockResolvedValue(mockAnalytics);

      const result = await service.getRevenueAnalytics(7);

      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('totals');
      expect(result.period.days).toBe(7);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.totals.revenue).toBe(450);
      expect(result.totals.clicks).toBe(225);
      expect(result.totals.conversions).toBe(23);
    });

    it('should group analytics by date correctly', async () => {
      const sameDate = new Date('2024-01-01');
      const mockAnalytics = [
        { date: sameDate, revenue: 100, clicks: 50, conversions: 5 },
        { date: sameDate, revenue: 150, clicks: 75, conversions: 8 },
      ];

      mockPrismaService.productAnalytics.findMany.mockResolvedValue(mockAnalytics);

      const result = await service.getRevenueAnalytics(7);

      const dateKey = '2024-01-01';
      const dayData = result.data.find((d: any) => d.date === dateKey);

      expect(dayData).toBeDefined();
      expect(dayData.revenue).toBe(250);
      expect(dayData.clicks).toBe(125);
      expect(dayData.conversions).toBe(13);
    });

    it('should handle empty analytics data', async () => {
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([]);

      const result = await service.getRevenueAnalytics(7);

      expect(result.data).toHaveLength(0);
      expect(result.totals.revenue).toBe(0);
      expect(result.totals.clicks).toBe(0);
      expect(result.totals.conversions).toBe(0);
    });

    it('should calculate correct date range', async () => {
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([]);

      const days = 30;
      const result = await service.getRevenueAnalytics(days);

      expect(result.period.days).toBe(30);
      expect(result.period.startDate).toBeInstanceOf(Date);
      expect(result.period.endDate).toBeInstanceOf(Date);

      const daysDiff = Math.floor(
        (result.period.endDate.getTime() - result.period.startDate.getTime()) /
          (24 * 60 * 60 * 1000),
      );
      expect(daysDiff).toBe(days);
    });

    it('should handle decimal revenue values correctly', async () => {
      const mockAnalytics = [
        { date: new Date(), revenue: 10.55, clicks: 5, conversions: 1 },
        { date: new Date(), revenue: 20.75, clicks: 10, conversions: 2 },
      ];

      mockPrismaService.productAnalytics.findMany.mockResolvedValue(mockAnalytics);

      const result = await service.getRevenueAnalytics(7);

      expect(result.totals.revenue).toBeCloseTo(31.3, 1);
    });
  });

  describe('getTopProducts', () => {
    it('should return top performing products with analytics', async () => {
      const mockProducts = [
        { id: 'p1', title: 'Product 1', overallScore: 0.9, price: 100, commission: 10 },
        { id: 'p2', title: 'Product 2', overallScore: 0.8, price: 200, commission: 20 },
      ];

      const mockAnalytics = [
        { productId: 'p1', _sum: { revenue: 500, clicks: 100, conversions: 5 } },
        { productId: 'p2', _sum: { revenue: 300, clicks: 50, conversions: 3 } },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.productAnalytics.groupBy.mockResolvedValue(mockAnalytics);

      const result = await service.getTopProducts(5);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('revenue');
      expect(result[0]).toHaveProperty('clicks');
      expect(result[0]).toHaveProperty('conversions');
      expect(result[0]).toHaveProperty('roi');
    });

    it('should handle products with no analytics', async () => {
      const mockProducts = [
        { id: 'p1', title: 'Product 1', overallScore: 0.9, price: 100, commission: 10 },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.productAnalytics.groupBy.mockResolvedValue([]);

      const result = await service.getTopProducts(5);

      expect(result).toHaveLength(1);
      expect(result[0].revenue).toBe(0);
      expect(result[0].clicks).toBe(0);
      expect(result[0].conversions).toBe(0);
    });

    it('should limit results to specified count', async () => {
      const mockProducts = Array.from({ length: 10 }, (_, i) => ({
        id: `p${i}`,
        title: `Product ${i}`,
        overallScore: 0.5,
        price: 100,
        commission: 10,
      }));

      // Return only 3 products due to take: 3 in the query
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts.slice(0, 3));
      mockPrismaService.productAnalytics.groupBy.mockResolvedValue([]);

      const result = await service.getTopProducts(3);

      expect(result).toHaveLength(3);
    });

    it('should return empty array when no products exist', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const result = await service.getTopProducts(5);

      expect(result).toHaveLength(0);
    });

    it('should calculate ROI for each product', async () => {
      const mockProducts = [
        { id: 'p1', title: 'Product 1', overallScore: 0.9, price: 100, commission: 10 },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.productAnalytics.groupBy.mockResolvedValue([]);

      const result = await service.getTopProducts(5);

      expect(roiCalculator.calculateProductROI).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
      );
      expect(result[0].roi).toBe(150);
    });

    it('should only query last 30 days of analytics', async () => {
      const mockProducts = [
        { id: 'p1', title: 'Product 1', overallScore: 0.9, price: 100, commission: 10 },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.productAnalytics.groupBy.mockResolvedValue([]);

      await service.getTopProducts(5);

      const groupByCall = mockPrismaService.productAnalytics.groupBy.mock.calls[0][0];
      expect(groupByCall.where.date.gte).toBeInstanceOf(Date);

      const _thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const queryDate = groupByCall.where.date.gte;
      const daysDiff = Math.floor((Date.now() - queryDate.getTime()) / (24 * 60 * 60 * 1000));

      expect(daysDiff).toBeGreaterThanOrEqual(29);
      expect(daysDiff).toBeLessThanOrEqual(31);
    });
  });

  describe('getProductPerformance', () => {
    it('should return detailed product performance', async () => {
      const mockProduct = {
        id: 'p1',
        title: 'Test Product',
        network: { id: 'n1', name: 'Network 1' },
      };

      const mockAnalytics = [{ revenue: 100, clicks: 50, conversions: 5, date: new Date() }];

      const mockVideos = [
        {
          id: 'v1',
          title: 'Video 1',
          status: 'READY',
          createdAt: new Date(),
          _count: { publications: 2 },
        },
      ];

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productAnalytics.findMany.mockResolvedValue(mockAnalytics);
      mockPrismaService.video.findMany.mockResolvedValue(mockVideos);
      mockPrismaService.platformAnalytics.groupBy.mockResolvedValue([]);

      const result = await service.getProductPerformance('p1');

      expect(performanceAnalyzer.analyzeProduct).toHaveBeenCalled();
      expect(result).toHaveProperty('product');
      expect(result).toHaveProperty('performance');
    });

    it('should throw error if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.getProductPerformance('invalid-id')).rejects.toThrow(
        'Product not found',
      );
    });

    it('should include last 30 days of analytics', async () => {
      const mockProduct = {
        id: 'p1',
        title: 'Test Product',
        network: { id: 'n1', name: 'Network 1' },
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([]);
      mockPrismaService.video.findMany.mockResolvedValue([]);
      mockPrismaService.platformAnalytics.groupBy.mockResolvedValue([]);

      await service.getProductPerformance('p1');

      const findManyCall = mockPrismaService.productAnalytics.findMany.mock.calls[0][0];
      expect(findManyCall.take).toBe(30);
      expect(findManyCall.orderBy).toEqual({ date: 'desc' });
    });

    it('should aggregate publication analytics by video', async () => {
      const mockProduct = {
        id: 'p1',
        title: 'Test Product',
        network: { id: 'n1', name: 'Network 1' },
      };

      const mockVideos = [
        {
          id: 'v1',
          title: 'Video 1',
          status: 'READY',
          createdAt: new Date(),
          _count: { publications: 1 },
        },
        {
          id: 'v2',
          title: 'Video 2',
          status: 'READY',
          createdAt: new Date(),
          _count: { publications: 1 },
        },
      ];

      const mockPubAnalytics = [
        {
          publicationId: 'pub1',
          _sum: { views: 1000, likes: 50, comments: 10, shares: 5, clicks: 20 },
        },
        {
          publicationId: 'pub2',
          _sum: { views: 2000, likes: 100, comments: 20, shares: 10, clicks: 40 },
        },
      ];

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productAnalytics.findMany.mockResolvedValue([]);
      mockPrismaService.video.findMany.mockResolvedValue(mockVideos);
      mockPrismaService.platformAnalytics.groupBy.mockResolvedValue(mockPubAnalytics);

      await service.getProductPerformance('p1');

      expect(mockPrismaService.platformAnalytics.groupBy).toHaveBeenCalled();
      const analyzeCall = (performanceAnalyzer.analyzeProduct as jest.Mock).mock.calls[0][0];
      expect(analyzeCall.publicationAnalytics).toEqual(mockPubAnalytics);
    });
  });

  describe('getPlatformComparison', () => {
    it('should compare performance across all platforms', async () => {
      // YouTube
      mockPrismaService.publication.findMany.mockResolvedValueOnce([
        { id: 'pub1' },
        { id: 'pub2' },
      ]);
      mockPrismaService.platformAnalytics.aggregate.mockResolvedValueOnce({
        _sum: { views: 10000, likes: 500, comments: 100, shares: 50 },
      });

      // TikTok
      mockPrismaService.publication.findMany.mockResolvedValueOnce([{ id: 'pub3' }]);
      mockPrismaService.platformAnalytics.aggregate.mockResolvedValueOnce({
        _sum: { views: 20000, likes: 1000, comments: 200, shares: 100 },
      });

      // Instagram
      mockPrismaService.publication.findMany.mockResolvedValueOnce([{ id: 'pub4' }]);
      mockPrismaService.platformAnalytics.aggregate.mockResolvedValueOnce({
        _sum: { views: 5000, likes: 250, comments: 50, shares: 25 },
      });

      const result = await service.getPlatformComparison();

      expect(result).toHaveProperty('platforms');
      expect(result).toHaveProperty('winner');
      expect(result.platforms).toHaveLength(3);
      expect(result.winner.platform).toBe('TIKTOK'); // Highest views
    });

    it('should handle platforms with no publications', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([]);

      const result = await service.getPlatformComparison();

      expect(result.platforms).toHaveLength(3);
      result.platforms.forEach((p: any) => {
        expect(p.publications).toBe(0);
        expect(p.views).toBe(0);
        expect(p.engagement).toBe(0);
      });
    });

    it('should calculate engagement rate correctly', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([{ id: 'pub1' }]);
      mockPrismaService.platformAnalytics.aggregate.mockResolvedValue({
        _sum: { views: 10000, likes: 500, comments: 100, shares: 50 },
      });

      const result = await service.getPlatformComparison();

      const platform = result.platforms[0];
      // Engagement rate = ((500 + 100 + 50) / 10000) * 100 = 6.5%
      expect(platform.avgEngagementRate).toBeCloseTo(6.5, 1);
    });

    it('should handle zero views gracefully', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([{ id: 'pub1' }]);
      mockPrismaService.platformAnalytics.aggregate.mockResolvedValue({
        _sum: { views: 0, likes: 0, comments: 0, shares: 0 },
      });

      const result = await service.getPlatformComparison();

      const platform = result.platforms[0];
      expect(platform.avgEngagementRate).toBe(0);
    });

    it('should only include published publications', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([]);
      mockPrismaService.platformAnalytics.aggregate.mockResolvedValue({
        _sum: { views: 0, likes: 0, comments: 0, shares: 0 },
      });

      await service.getPlatformComparison();

      const findManyCalls = mockPrismaService.publication.findMany.mock.calls;
      findManyCalls.forEach((call: any) => {
        expect(call[0].where.status).toBe('PUBLISHED');
      });
    });
  });

  describe('collectAllAnalytics', () => {
    it('should collect analytics from all platforms', async () => {
      const mockResult = { collected: 150, platforms: ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'] };
      (metricsCollector.collectAll as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.collectAllAnalytics();

      expect(result).toEqual(mockResult);
      expect(metricsCollector.collectAll).toHaveBeenCalled();
    });

    it('should log collection progress', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      (metricsCollector.collectAll as jest.Mock).mockResolvedValue({
        collected: 10,
        platforms: [],
      });

      await service.collectAllAnalytics();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Collecting analytics'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('10 records'));

      consoleSpy.mockRestore();
    });

    it('should handle collection errors', async () => {
      (metricsCollector.collectAll as jest.Mock).mockRejectedValue(new Error('Collection failed'));

      await expect(service.collectAllAnalytics()).rejects.toThrow('Collection failed');
    });
  });

  describe('getROIAnalysis', () => {
    it('should return system-wide ROI analysis', async () => {
      const mockROI = {
        revenue: { total: 5000 },
        costs: { total: 500 },
        roi: { percentage: 900, profit: 4500 },
      };
      (roiCalculator.calculateSystemROI as jest.Mock).mockResolvedValue(mockROI);

      const result = await service.getROIAnalysis();

      expect(result).toEqual(mockROI);
      expect(roiCalculator.calculateSystemROI).toHaveBeenCalled();
    });

    it('should delegate to ROI calculator service', async () => {
      await service.getROIAnalysis();

      expect(roiCalculator.calculateSystemROI).toHaveBeenCalledTimes(1);
    });
  });

  describe('private helper methods', () => {
    describe('getTotalRevenue', () => {
      it('should aggregate total revenue from productAnalytics', async () => {
        mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
          _sum: { revenue: 5000 },
        });
        mockPrismaService.product.count.mockResolvedValue(10);
        mockPrismaService.video.count.mockResolvedValue(50);
        mockPrismaService.publication.count.mockResolvedValue(100);
        mockPrismaService.productAnalytics.findMany.mockResolvedValue([]);
        mockPrismaService.product.findMany.mockResolvedValue([]);

        const result = await service.getDashboardOverview();

        expect(result.revenue.total).toBe(5000);
      });

      it('should handle null revenue sum', async () => {
        mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
          _sum: { revenue: null },
        });
        mockPrismaService.product.count.mockResolvedValue(0);
        mockPrismaService.video.count.mockResolvedValue(0);
        mockPrismaService.publication.count.mockResolvedValue(0);
        mockPrismaService.productAnalytics.findMany.mockResolvedValue([]);
        mockPrismaService.product.findMany.mockResolvedValue([]);

        const result = await service.getDashboardOverview();

        expect(result.revenue.total).toBe(0);
      });
    });

    describe('calculateGrowth', () => {
      it('should return 0 for insufficient data', async () => {
        mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
          _sum: { revenue: 100 },
        });
        mockPrismaService.product.count.mockResolvedValue(5);
        mockPrismaService.video.count.mockResolvedValue(10);
        mockPrismaService.publication.count.mockResolvedValue(20);
        mockPrismaService.productAnalytics.findMany.mockResolvedValue([
          { revenue: 100, date: new Date() },
        ]);
        mockPrismaService.product.findMany.mockResolvedValue([]);

        const result = await service.getDashboardOverview();

        expect(result.revenue.growth).toBe(0);
      });

      it('should return 100% when previous period has zero revenue', async () => {
        mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
          _sum: { revenue: 200 },
        });
        mockPrismaService.product.count.mockResolvedValue(5);
        mockPrismaService.video.count.mockResolvedValue(10);
        mockPrismaService.publication.count.mockResolvedValue(20);
        mockPrismaService.productAnalytics.findMany.mockResolvedValue([
          { revenue: 200, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
          { revenue: 0, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
          { revenue: 0, date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
        ]);
        mockPrismaService.product.findMany.mockResolvedValue([]);

        const result = await service.getDashboardOverview();

        expect(result.revenue.growth).toBe(100);
      });

      it('should calculate positive growth correctly', async () => {
        mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
          _sum: { revenue: 1000 },
        });
        mockPrismaService.product.count.mockResolvedValue(5);
        mockPrismaService.video.count.mockResolvedValue(10);
        mockPrismaService.publication.count.mockResolvedValue(20);

        // Recent higher than previous
        mockPrismaService.productAnalytics.findMany.mockResolvedValue([
          { revenue: 300, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
          { revenue: 300, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
          { revenue: 200, date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
          { revenue: 200, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
        ]);
        mockPrismaService.product.findMany.mockResolvedValue([]);

        const result = await service.getDashboardOverview();

        // Growth = (600 - 400) / 400 * 100 = 50%
        expect(result.revenue.growth).toBeCloseTo(50, 0);
      });

      it('should calculate negative growth correctly', async () => {
        mockPrismaService.productAnalytics.aggregate.mockResolvedValue({
          _sum: { revenue: 1000 },
        });
        mockPrismaService.product.count.mockResolvedValue(5);
        mockPrismaService.video.count.mockResolvedValue(10);
        mockPrismaService.publication.count.mockResolvedValue(20);

        // Recent lower than previous
        mockPrismaService.productAnalytics.findMany.mockResolvedValue([
          { revenue: 100, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
          { revenue: 100, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
          { revenue: 300, date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
          { revenue: 300, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
        ]);
        mockPrismaService.product.findMany.mockResolvedValue([]);

        const result = await service.getDashboardOverview();

        // Growth = (200 - 600) / 600 * 100 = -66.67%
        expect(result.revenue.growth).toBeLessThan(0);
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors in getDashboardOverview', async () => {
      mockPrismaService.productAnalytics.aggregate.mockRejectedValue(new Error('Database error'));

      await expect(service.getDashboardOverview()).rejects.toThrow('Database error');
    });

    it('should handle database errors in getRevenueAnalytics', async () => {
      mockPrismaService.productAnalytics.findMany.mockRejectedValue(new Error('Query failed'));

      await expect(service.getRevenueAnalytics(7)).rejects.toThrow('Query failed');
    });

    it('should handle database errors in getTopProducts', async () => {
      mockPrismaService.product.findMany.mockRejectedValue(new Error('Product query failed'));

      await expect(service.getTopProducts(5)).rejects.toThrow('Product query failed');
    });

    it('should handle database errors in getPlatformComparison', async () => {
      mockPrismaService.publication.findMany.mockRejectedValue(
        new Error('Publication query failed'),
      );

      await expect(service.getPlatformComparison()).rejects.toThrow('Publication query failed');
    });
  });
});
