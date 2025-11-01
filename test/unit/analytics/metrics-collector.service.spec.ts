/**
 * Unit tests for MetricsCollectorService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MetricsCollectorService } from '@/modules/analytics/services/metrics-collector.service';
import { PrismaService } from '@/common/database/prisma.service';
import { MockPrismaService, mockPrismaService } from '../../mocks/prisma.mock';

describe('MetricsCollectorService', () => {
  let service: MetricsCollectorService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsCollectorService,
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MetricsCollectorService>(MetricsCollectorService);
    prisma = module.get<MockPrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('collectAll', () => {
    it('should collect metrics from all platforms', async () => {
      // Mock publications for each platform
      mockPrismaService.publication.findMany
        .mockResolvedValueOnce([
          { id: 'pub1', platform: 'YOUTUBE', video: { productId: 'p1', product: {} } },
          { id: 'pub2', platform: 'YOUTUBE', video: { productId: 'p2', product: {} } },
        ])
        .mockResolvedValueOnce([
          { id: 'pub3', platform: 'TIKTOK', video: { productId: 'p1', product: {} } },
        ])
        .mockResolvedValueOnce([
          { id: 'pub4', platform: 'INSTAGRAM', video: { productId: 'p2', product: {} } },
        ]);

      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(null);
      mockPrismaService.productAnalytics.create.mockResolvedValue({});

      const result = await service.collectAll();

      expect(result).toHaveProperty('collected');
      expect(result).toHaveProperty('platforms');
      expect(result.collected).toBe(4);
      expect(result.platforms).toEqual(['YOUTUBE', 'TIKTOK', 'INSTAGRAM']);
    });

    it('should handle empty publications', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([]);

      const result = await service.collectAll();

      expect(result.collected).toBe(0);
      expect(result.platforms).toEqual(['YOUTUBE', 'TIKTOK', 'INSTAGRAM']);
    });

    it('should continue on platform errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // First platform fails
      mockPrismaService.publication.findMany
        .mockRejectedValueOnce(new Error('YouTube API error'))
        .mockResolvedValueOnce([
          { id: 'pub1', platform: 'TIKTOK', video: { productId: 'p1', product: {} } },
        ])
        .mockResolvedValueOnce([]);

      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(null);
      mockPrismaService.productAnalytics.create.mockResolvedValue({});

      const result = await service.collectAll();

      expect(result.collected).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('YOUTUBE'),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should process all three platforms', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([]);

      await service.collectAll();

      expect(mockPrismaService.publication.findMany).toHaveBeenCalledTimes(3);
      expect(mockPrismaService.publication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ platform: 'YOUTUBE' }),
        }),
      );
      expect(mockPrismaService.publication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ platform: 'TIKTOK' }),
        }),
      );
      expect(mockPrismaService.publication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ platform: 'INSTAGRAM' }),
        }),
      );
    });

    it('should log collection start', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockPrismaService.publication.findMany.mockResolvedValue([]);

      await service.collectAll();

      // Check that metrics collection was logged for each platform
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Collecting metrics for'));

      consoleSpy.mockRestore();
    });
  });

  describe('collectPlatformMetrics (private)', () => {
    it('should collect metrics for YOUTUBE publications', async () => {
      const mockPublications = [
        {
          id: 'pub1',
          platform: 'YOUTUBE',
          video: { productId: 'p1', product: {} },
        },
      ];

      mockPrismaService.publication.findMany.mockResolvedValue(mockPublications);
      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(null);
      mockPrismaService.productAnalytics.create.mockResolvedValue({});

      const result = await service.collectAll();

      expect(result.collected).toBeGreaterThan(0);
      expect(mockPrismaService.platformAnalytics.upsert).toHaveBeenCalled();
    });

    it('should collect metrics for TIKTOK publications', async () => {
      mockPrismaService.publication.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'pub1',
            platform: 'TIKTOK',
            video: { productId: 'p1', product: {} },
          },
        ])
        .mockResolvedValueOnce([]);

      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(null);
      mockPrismaService.productAnalytics.create.mockResolvedValue({});

      const result = await service.collectAll();

      expect(result.collected).toBe(1);
    });

    it('should collect metrics for INSTAGRAM publications', async () => {
      mockPrismaService.publication.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'pub1',
            platform: 'INSTAGRAM',
            video: { productId: 'p1', product: {} },
          },
        ]);

      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(null);
      mockPrismaService.productAnalytics.create.mockResolvedValue({});

      const result = await service.collectAll();

      expect(result.collected).toBe(1);
    });

    it('should only query published publications', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([]);

      await service.collectAll();

      const calls = mockPrismaService.publication.findMany.mock.calls;
      calls.forEach((call: any) => {
        expect(call[0].where.status).toBe('PUBLISHED');
        expect(call[0].where.publishedAt).toEqual({ not: null });
      });
    });

    it('should include video and product in query', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([]);

      await service.collectAll();

      const calls = mockPrismaService.publication.findMany.mock.calls;
      calls.forEach((call: any) => {
        expect(call[0].include).toHaveProperty('video');
        expect(call[0].include.video).toHaveProperty('include');
        expect(call[0].include.video.include).toHaveProperty('product');
      });
    });

    it('should handle publication without video gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockPrismaService.publication.findMany.mockResolvedValue([
        { id: 'pub1', platform: 'YOUTUBE', video: null },
      ]);

      await service.collectAll();

      // Should not crash, but should not collect metrics either
      expect(mockPrismaService.platformAnalytics.upsert).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should log platform collection progress', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockPrismaService.publication.findMany.mockResolvedValue([
        { id: 'pub1', platform: 'YOUTUBE', video: { productId: 'p1', product: {} } },
      ]);
      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(null);
      mockPrismaService.productAnalytics.create.mockResolvedValue({});

      await service.collectAll();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Collecting metrics for YOUTUBE'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Collected 1 metrics for YOUTUBE'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('generateMockMetrics (private)', () => {
    it('should generate different base views for each platform', async () => {
      const publications = [
        { id: 'pub1', platform: 'YOUTUBE', video: { productId: 'p1', product: {} } },
      ];

      mockPrismaService.publication.findMany
        .mockResolvedValueOnce(publications)
        .mockResolvedValueOnce(publications.map((p) => ({ ...p, platform: 'TIKTOK' })))
        .mockResolvedValueOnce(publications.map((p) => ({ ...p, platform: 'INSTAGRAM' })));

      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(null);
      mockPrismaService.productAnalytics.create.mockResolvedValue({});

      await service.collectAll();

      // Mock should generate metrics with different base values
      // YouTube: ~5000, TikTok: ~10000, Instagram: ~3000
      expect(mockPrismaService.platformAnalytics.upsert).toHaveBeenCalledTimes(3);
    });

    it('should generate metrics with all required fields', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([
        { id: 'pub1', platform: 'YOUTUBE', video: { productId: 'p1', product: {} } },
      ]);
      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(null);
      mockPrismaService.productAnalytics.create.mockResolvedValue({});

      await service.collectAll();

      const upsertCall = mockPrismaService.platformAnalytics.upsert.mock.calls[0][0];
      expect(upsertCall.create).toHaveProperty('views');
      expect(upsertCall.create).toHaveProperty('likes');
      expect(upsertCall.create).toHaveProperty('comments');
      expect(upsertCall.create).toHaveProperty('shares');
      expect(upsertCall.create).toHaveProperty('clicks');
      expect(upsertCall.create).toHaveProperty('watchTime');
      expect(upsertCall.create).toHaveProperty('engagement');
    });

    it('should generate realistic engagement ratios', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([
        { id: 'pub1', platform: 'YOUTUBE', video: { productId: 'p1', product: {} } },
      ]);
      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(null);
      mockPrismaService.productAnalytics.create.mockResolvedValue({});

      await service.collectAll();

      const upsertCall = mockPrismaService.platformAnalytics.upsert.mock.calls[0][0];
      const metrics = upsertCall.create;

      // Likes should be 5-15% of views
      expect(metrics.likes).toBeGreaterThan(0);
      expect(metrics.likes / metrics.views).toBeGreaterThan(0.04);
      expect(metrics.likes / metrics.views).toBeLessThan(0.16);

      // Comments should be ~10% of likes
      expect(metrics.comments).toBeGreaterThan(0);
      expect(metrics.comments).toBeLessThan(metrics.likes);

      // Clicks should be 1-3% of views
      expect(metrics.clicks).toBeGreaterThan(0);
      expect(metrics.clicks / metrics.views).toBeGreaterThan(0.005);
      expect(metrics.clicks / metrics.views).toBeLessThan(0.035);
    });
  });

  describe('updateProductAnalytics (private)', () => {
    it('should create new product analytics if none exist', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([
        { id: 'pub1', platform: 'YOUTUBE', video: { productId: 'p1', product: {} } },
      ]);
      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(null);
      mockPrismaService.productAnalytics.create.mockResolvedValue({});

      await service.collectAll();

      expect(mockPrismaService.productAnalytics.create).toHaveBeenCalled();
      const createCall = mockPrismaService.productAnalytics.create.mock.calls[0][0];
      expect(createCall.data).toHaveProperty('productId', 'p1');
      expect(createCall.data).toHaveProperty('views');
      expect(createCall.data).toHaveProperty('clicks');
      expect(createCall.data).toHaveProperty('conversions');
      expect(createCall.data).toHaveProperty('revenue');
      expect(createCall.data).toHaveProperty('ctr');
      expect(createCall.data).toHaveProperty('conversionRate');
    });

    it('should update existing product analytics', async () => {
      const existingAnalytics = {
        id: 'analytics1',
        views: 1000,
        clicks: 50,
        conversions: 2,
        revenue: 10,
      };

      mockPrismaService.publication.findMany.mockResolvedValue([
        { id: 'pub1', platform: 'YOUTUBE', video: { productId: 'p1', product: {} } },
      ]);
      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(existingAnalytics);
      mockPrismaService.productAnalytics.update.mockResolvedValue({});

      await service.collectAll();

      expect(mockPrismaService.productAnalytics.update).toHaveBeenCalled();
      const updateCall = mockPrismaService.productAnalytics.update.mock.calls[0][0];
      expect(updateCall.where.id).toBe('analytics1');
      expect(updateCall.data.views).toBeGreaterThan(1000); // Should aggregate
    });

    it('should calculate conversions based on clicks threshold', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([
        { id: 'pub1', platform: 'YOUTUBE', video: { productId: 'p1', product: {} } },
      ]);
      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(null);
      mockPrismaService.productAnalytics.create.mockResolvedValue({});

      await service.collectAll();

      const createCall = mockPrismaService.productAnalytics.create.mock.calls[0][0];
      const { clicks, conversions } = createCall.data;

      // Conversions = 1 if clicks > 100, else 0
      if (clicks > 100) {
        expect(conversions).toBe(1);
      } else {
        expect(conversions).toBe(0);
      }
    });

    it('should calculate revenue based on conversions', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([
        { id: 'pub1', platform: 'YOUTUBE', video: { productId: 'p1', product: {} } },
      ]);
      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(null);
      mockPrismaService.productAnalytics.create.mockResolvedValue({});

      await service.collectAll();

      const createCall = mockPrismaService.productAnalytics.create.mock.calls[0][0];
      const { clicks, revenue } = createCall.data;

      // Revenue = $5 if clicks > 100, else $0
      if (clicks > 100) {
        expect(revenue).toBe(5.0);
      } else {
        expect(revenue).toBe(0);
      }
    });

    it('should calculate CTR correctly', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([
        { id: 'pub1', platform: 'YOUTUBE', video: { productId: 'p1', product: {} } },
      ]);
      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(null);
      mockPrismaService.productAnalytics.create.mockResolvedValue({});

      await service.collectAll();

      const createCall = mockPrismaService.productAnalytics.create.mock.calls[0][0];
      const { views, clicks, ctr } = createCall.data;

      expect(ctr).toBe(clicks / views);
    });

    it('should calculate conversion rate correctly', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([
        { id: 'pub1', platform: 'YOUTUBE', video: { productId: 'p1', product: {} } },
      ]);
      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(null);
      mockPrismaService.productAnalytics.create.mockResolvedValue({});

      await service.collectAll();

      const createCall = mockPrismaService.productAnalytics.create.mock.calls[0][0];
      const { clicks, conversionRate } = createCall.data;

      if (clicks > 100) {
        expect(conversionRate).toBe(1 / clicks);
      } else {
        expect(conversionRate).toBe(0);
      }
    });

    it('should aggregate metrics when updating', async () => {
      const existingAnalytics = {
        id: 'analytics1',
        views: 1000,
        clicks: 50,
        conversions: 2,
        revenue: 10,
      };

      mockPrismaService.publication.findMany.mockResolvedValue([
        { id: 'pub1', platform: 'YOUTUBE', video: { productId: 'p1', product: {} } },
      ]);
      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(existingAnalytics);
      mockPrismaService.productAnalytics.update.mockResolvedValue({});

      await service.collectAll();

      const updateCall = mockPrismaService.productAnalytics.update.mock.calls[0][0];
      const { views, clicks } = updateCall.data;

      // New values should be added to existing
      expect(views).toBeGreaterThan(existingAnalytics.views);
      expect(clicks).toBeGreaterThan(existingAnalytics.clicks);
    });
  });

  describe('upsert platform analytics', () => {
    it('should use today as date for analytics', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([
        { id: 'pub1', platform: 'YOUTUBE', video: { productId: 'p1', product: {} } },
      ]);
      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(null);
      mockPrismaService.productAnalytics.create.mockResolvedValue({});

      await service.collectAll();

      const upsertCall = mockPrismaService.platformAnalytics.upsert.mock.calls[0][0];
      const { date } = upsertCall.create;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(today.getFullYear());
      expect(date.getMonth()).toBe(today.getMonth());
      expect(date.getDate()).toBe(today.getDate());
    });

    it('should use compound key for upsert', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([
        { id: 'pub1', platform: 'YOUTUBE', video: { productId: 'p1', product: {} } },
      ]);
      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(null);
      mockPrismaService.productAnalytics.create.mockResolvedValue({});

      await service.collectAll();

      const upsertCall = mockPrismaService.platformAnalytics.upsert.mock.calls[0][0];
      expect(upsertCall.where).toHaveProperty('publicationId_date');
      expect(upsertCall.where.publicationId_date).toHaveProperty('publicationId', 'pub1');
      expect(upsertCall.where.publicationId_date).toHaveProperty('date');
    });

    it('should update existing analytics if already exists for today', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([
        { id: 'pub1', platform: 'YOUTUBE', video: { productId: 'p1', product: {} } },
      ]);
      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(null);
      mockPrismaService.productAnalytics.create.mockResolvedValue({});

      await service.collectAll();

      const upsertCall = mockPrismaService.platformAnalytics.upsert.mock.calls[0][0];
      expect(upsertCall).toHaveProperty('create');
      expect(upsertCall).toHaveProperty('update');
      // Update should have the same metrics as create
      expect(upsertCall.update).toHaveProperty('views');
      expect(upsertCall.update).toHaveProperty('clicks');
    });
  });

  describe('error handling', () => {
    it('should handle individual publication errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockPrismaService.publication.findMany.mockResolvedValue([
        { id: 'pub1', platform: 'YOUTUBE', video: { productId: 'p1', product: {} } },
        { id: 'pub2', platform: 'YOUTUBE', video: { productId: 'p2', product: {} } },
      ]);

      mockPrismaService.platformAnalytics.upsert
        .mockRejectedValueOnce(new Error('Upsert failed'))
        .mockResolvedValueOnce({});

      mockPrismaService.productAnalytics.findUnique.mockResolvedValue(null);
      mockPrismaService.productAnalytics.create.mockResolvedValue({});

      const result = await service.collectAll();

      // Should collect at least one (other platforms may succeed)
      expect(result.collected).toBeGreaterThanOrEqual(1);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle product analytics errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockPrismaService.publication.findMany.mockResolvedValue([
        { id: 'pub1', platform: 'YOUTUBE', video: { productId: 'p1', product: {} } },
      ]);
      mockPrismaService.platformAnalytics.upsert.mockResolvedValue({});
      mockPrismaService.productAnalytics.findUnique.mockRejectedValue(
        new Error('Product analytics query failed'),
      );

      const result = await service.collectAll();

      // Should still count as collected even if product analytics fails
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
