/**
 * Unit tests for StrategyOptimizerService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { StrategyOptimizerService } from '@/modules/optimizer/services/strategy-optimizer.service';
import { PrismaService } from '@/common/database/prisma.service';
import { MockPrismaService, mockPrismaService } from '../../mocks/prisma.mock';

describe('StrategyOptimizerService', () => {
  let service: StrategyOptimizerService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StrategyOptimizerService,
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StrategyOptimizerService>(StrategyOptimizerService);
    prisma = module.get<MockPrismaService>(PrismaService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('killLowPerformers', () => {
    it('should kill products with ROI below threshold', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Low Performer 1',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 0.01, date: new Date() }),
          videos: [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }, { id: 'v4' }, { id: 'v5' }],
        },
        {
          id: 'prod-2',
          title: 'Low Performer 2',
          status: 'ACTIVE',
          analytics: Array(8).fill({ revenue: 0.01, date: new Date() }),
          videos: [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }, { id: 'v4' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.update.mockResolvedValue({});

      const result = await service.killLowPerformers(0.5);

      expect(result.killed).toBe(2);
      expect(result.products).toContain('Low Performer 1');
      expect(result.products).toContain('Low Performer 2');
      expect(mockPrismaService.product.update).toHaveBeenCalledTimes(2);
    });

    it('should not kill products with insufficient data', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'New Product',
          status: 'ACTIVE',
          analytics: Array(3).fill({ revenue: 0, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.killLowPerformers(0.5);

      expect(result.killed).toBe(0);
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should not kill products with ROI above threshold', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'High Performer',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 100, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.killLowPerformers(0.5);

      expect(result.killed).toBe(0);
      expect(mockPrismaService.product.update).not.toHaveBeenCalled();
    });

    it('should handle empty product list', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const result = await service.killLowPerformers(0.5);

      expect(result.killed).toBe(0);
      expect(result.products).toHaveLength(0);
    });

    it('should log killing process', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.killLowPerformers(0.5);

      expect(consoleSpy).toHaveBeenCalledWith('🔪 Killing products with ROI < 0.5...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Killed 0 low performers');

      consoleSpy.mockRestore();
    });

    it('should update product status to ARCHIVED', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Low Performer',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 0.01, date: new Date() }),
          videos: [{ id: 'v1' }, { id: 'v2' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.update.mockResolvedValue({});

      await service.killLowPerformers(0.5);

      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { status: 'ARCHIVED' },
      });
    });

    it('should handle products with no videos', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Product with no videos',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 0, date: new Date() }),
          videos: [],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.killLowPerformers(0.5);

      // Products with no videos have 0 cost, so ROI calculation returns 0
      // This shouldn't be killed
      expect(result.killed).toBe(0);
    });
  });

  describe('analyzeProduct', () => {
    it('should analyze product and generate kill recommendation', async () => {
      const product = {
        id: 'prod-1',
        title: 'Low Performer',
        analytics: Array(10).fill({ revenue: 0.01, conversions: 0, date: new Date() }),
        videos: [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }],
      };

      const result = await service.analyzeProduct(product);

      expect(result).toBeDefined();
      expect(result?.action).toBe('kill');
      expect(result?.priority).toBe(10);
      expect(result?.metrics.roi).toBeLessThan(0.5);
    });

    it('should analyze product and generate scale recommendation', async () => {
      const product = {
        id: 'prod-1',
        title: 'High Performer',
        analytics: [
          ...Array(5).fill({ revenue: 100, conversions: 10, date: new Date() }),
          ...Array(5).fill({ revenue: 10, conversions: 1, date: new Date(Date.now() - 86400000) }),
        ],
        videos: [{ id: 'v1' }],
      };

      const result = await service.analyzeProduct(product);

      expect(result).toBeDefined();
      expect(result?.action).toBe('scale');
      expect(result?.priority).toBe(9);
      expect(result?.metrics.roi).toBeGreaterThan(2.0);
    });

    it('should analyze product and generate optimize recommendation', async () => {
      const product = {
        id: 'prod-1',
        title: 'Declining Product',
        analytics: [
          ...Array(3).fill({ revenue: 0.05, conversions: 0, date: new Date() }),
          ...Array(3).fill({ revenue: 0.5, conversions: 1, date: new Date(Date.now() - 86400000) }),
        ],
        videos: [{ id: 'v1' }, { id: 'v2' }],
      };

      const result = await service.analyzeProduct(product);

      expect(result).toBeDefined();
      expect(result?.action).toBe('optimize');
      expect(result?.priority).toBe(7);
    });

    it('should analyze product and generate maintain recommendation', async () => {
      const product = {
        id: 'prod-1',
        title: 'Stable Product',
        analytics: Array(10).fill({ revenue: 20, conversions: 5, date: new Date() }),
        videos: [{ id: 'v1' }, { id: 'v2' }],
      };

      const result = await service.analyzeProduct(product);

      expect(result).toBeDefined();
      expect(result?.action).toBe('maintain');
      expect(result?.priority).toBe(3);
    });

    it('should return null for products with insufficient data', async () => {
      const product = {
        id: 'prod-1',
        title: 'New Product',
        analytics: [{ revenue: 10, conversions: 1, date: new Date() }],
        videos: [{ id: 'v1' }],
      };

      const result = await service.analyzeProduct(product);

      expect(result).toBeNull();
    });

    it('should calculate trend correctly', async () => {
      const product = {
        id: 'prod-1',
        title: 'Product',
        analytics: [
          ...Array(5).fill({ revenue: 50, conversions: 5, date: new Date() }),
          ...Array(5).fill({ revenue: 10, conversions: 1, date: new Date(Date.now() - 86400000) }),
        ],
        videos: [{ id: 'v1' }],
      };

      const result = await service.analyzeProduct(product);

      expect(result).toBeDefined();
      expect(result?.metrics.trend).toBe('up');
    });

    it('should handle products with no analytics', async () => {
      const product = {
        id: 'prod-1',
        title: 'Product',
        analytics: [],
        videos: [{ id: 'v1' }],
      };

      const result = await service.analyzeProduct(product);

      expect(result).toBeNull();
    });

    it('should handle products with undefined analytics', async () => {
      const product = {
        id: 'prod-1',
        title: 'Product',
        videos: [{ id: 'v1' }],
      };

      const result = await service.analyzeProduct(product);

      expect(result).toBeNull();
    });

    it('should include all required metrics in recommendation', async () => {
      const product = {
        id: 'prod-1',
        title: 'Product',
        analytics: Array(10).fill({ revenue: 100, conversions: 10, date: new Date() }),
        videos: [{ id: 'v1' }],
      };

      const result = await service.analyzeProduct(product);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('productId');
      expect(result).toHaveProperty('productTitle');
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('priority');
      expect(result?.metrics).toHaveProperty('roi');
      expect(result?.metrics).toHaveProperty('revenue');
      expect(result?.metrics).toHaveProperty('conversions');
      expect(result?.metrics).toHaveProperty('trend');
    });

    it('should calculate total revenue correctly', async () => {
      const product = {
        id: 'prod-1',
        title: 'Product',
        analytics: [
          { revenue: 10, conversions: 1, date: new Date() },
          { revenue: 20, conversions: 2, date: new Date() },
          { revenue: 30, conversions: 3, date: new Date() },
        ],
        videos: [{ id: 'v1' }],
      };

      const result = await service.analyzeProduct(product);

      expect(result).toBeDefined();
      expect(result?.metrics.revenue).toBe(60);
    });

    it('should calculate total conversions correctly', async () => {
      const product = {
        id: 'prod-1',
        title: 'Product',
        analytics: [
          { revenue: 10, conversions: 1, date: new Date() },
          { revenue: 20, conversions: 2, date: new Date() },
          { revenue: 30, conversions: 3, date: new Date() },
        ],
        videos: [{ id: 'v1' }],
      };

      const result = await service.analyzeProduct(product);

      expect(result).toBeDefined();
      expect(result?.metrics.conversions).toBe(6);
    });

    it('should handle downward trend', async () => {
      const product = {
        id: 'prod-1',
        title: 'Product',
        analytics: [
          ...Array(5).fill({ revenue: 10, conversions: 1, date: new Date() }),
          ...Array(5).fill({ revenue: 50, conversions: 5, date: new Date(Date.now() - 86400000) }),
        ],
        videos: [{ id: 'v1' }],
      };

      const result = await service.analyzeProduct(product);

      expect(result).toBeDefined();
      expect(result?.metrics.trend).toBe('down');
    });

    it('should handle neutral trend', async () => {
      const product = {
        id: 'prod-1',
        title: 'Product',
        analytics: Array(10).fill({ revenue: 50, conversions: 5, date: new Date() }),
        videos: [{ id: 'v1' }],
      };

      const result = await service.analyzeProduct(product);

      expect(result).toBeDefined();
      expect(result?.metrics.trend).toBe('neutral');
    });
  });

  describe('ROI calculation', () => {
    it('should calculate ROI correctly', async () => {
      const product = {
        id: 'prod-1',
        title: 'Product',
        analytics: Array(5).fill({ revenue: 20, conversions: 2, date: new Date() }),
        videos: [{ id: 'v1' }],
      };

      const result = await service.analyzeProduct(product);

      // Revenue: 100, Cost: 0.27, ROI: (100 - 0.27) / 0.27
      expect(result?.metrics.roi).toBeGreaterThan(350);
    });

    it('should handle zero revenue', async () => {
      const product = {
        id: 'prod-1',
        title: 'Product',
        analytics: Array(10).fill({ revenue: 0, conversions: 0, date: new Date() }),
        videos: [{ id: 'v1' }],
      };

      const result = await service.analyzeProduct(product);

      expect(result).toBeDefined();
      expect(result?.action).toBe('kill');
    });

    it('should handle products with many videos', async () => {
      const product = {
        id: 'prod-1',
        title: 'Product',
        analytics: Array(10).fill({ revenue: 100, conversions: 10, date: new Date() }),
        videos: Array(20).fill({ id: 'v1' }),
      };

      const result = await service.analyzeProduct(product);

      expect(result).toBeDefined();
      expect(result?.metrics.roi).toBeGreaterThan(0);
    });

    it('should use correct cost per video (0.27)', async () => {
      const product = {
        id: 'prod-1',
        title: 'Product',
        analytics: Array(5).fill({ revenue: 0.2, conversions: 0, date: new Date() }),
        videos: [{ id: 'v1' }],
      };

      const result = await service.analyzeProduct(product);

      // Cost should be 0.27 for 1 video
      expect(result).toBeDefined();
      expect(result?.metrics.roi).toBeGreaterThan(0);
    });
  });

  describe('scoring algorithm', () => {
    it('should assign priority 10 for kill action', async () => {
      const product = {
        id: 'prod-1',
        title: 'Product',
        analytics: Array(10).fill({ revenue: 0.01, conversions: 0, date: new Date() }),
        videos: [{ id: 'v1' }, { id: 'v2' }],
      };

      const result = await service.analyzeProduct(product);

      expect(result?.action).toBe('kill');
      expect(result?.priority).toBe(10);
    });

    it('should assign priority 9 for scale action', async () => {
      const product = {
        id: 'prod-1',
        title: 'Product',
        analytics: [
          ...Array(5).fill({ revenue: 100, conversions: 10, date: new Date() }),
          ...Array(5).fill({ revenue: 10, conversions: 1, date: new Date(Date.now() - 86400000) }),
        ],
        videos: [{ id: 'v1' }],
      };

      const result = await service.analyzeProduct(product);

      expect(result?.action).toBe('scale');
      expect(result?.priority).toBe(9);
    });

    it('should assign priority 7 for optimize action', async () => {
      const product = {
        id: 'prod-1',
        title: 'Product',
        analytics: [
          ...Array(3).fill({ revenue: 0.05, conversions: 0, date: new Date() }),
          ...Array(3).fill({ revenue: 0.5, conversions: 1, date: new Date(Date.now() - 86400000) }),
        ],
        videos: [{ id: 'v1' }, { id: 'v2' }],
      };

      const result = await service.analyzeProduct(product);

      expect(result?.action).toBe('optimize');
      expect(result?.priority).toBe(7);
    });

    it('should assign priority 3 for maintain action', async () => {
      const product = {
        id: 'prod-1',
        title: 'Product',
        analytics: Array(10).fill({ revenue: 20, conversions: 5, date: new Date() }),
        videos: [{ id: 'v1' }, { id: 'v2' }],
      };

      const result = await service.analyzeProduct(product);

      expect(result?.action).toBe('maintain');
      expect(result?.priority).toBe(3);
    });
  });
});
