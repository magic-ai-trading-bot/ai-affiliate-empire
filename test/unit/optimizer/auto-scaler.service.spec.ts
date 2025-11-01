/**
 * Unit tests for AutoScalerService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AutoScalerService } from '@/modules/optimizer/services/auto-scaler.service';
import { PrismaService } from '@/common/database/prisma.service';
import { MockPrismaService, mockPrismaService } from '../../mocks/prisma.mock';

describe('AutoScalerService', () => {
  let service: AutoScalerService;
  let _prisma: MockPrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoScalerService,
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AutoScalerService>(AutoScalerService);
    _prisma = module.get<MockPrismaService>(PrismaService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('scaleWinners', () => {
    it('should scale products with ROI above threshold', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Winner 1',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 100, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
        {
          id: 'prod-2',
          title: 'Winner 2',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 150, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.systemConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        key: 'system_config',
        value: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.systemConfig.update.mockResolvedValue({});

      const result = await service.scaleWinners(2.0);

      expect(result.scaled).toBe(2);
      expect(result.products).toHaveLength(2);
      expect(result.products[0].title).toBe('Winner 1');
      expect(result.products[1].title).toBe('Winner 2');
    });

    it('should not scale products with ROI below threshold', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Low ROI Product',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 0.001, date: new Date() }),
          videos: [{ id: 'v1' }, { id: 'v2' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.scaleWinners(2.0);

      expect(result.scaled).toBe(0);
      expect(result.products).toHaveLength(0);
    });

    it('should handle empty product list', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const result = await service.scaleWinners(2.0);

      expect(result.scaled).toBe(0);
      expect(result.products).toHaveLength(0);
    });

    it('should log scaling process', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.scaleWinners(2.0);

      expect(consoleSpy).toHaveBeenCalledWith('📈 Scaling products with ROI > 2...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Scaled 0 winning products');

      consoleSpy.mockRestore();
    });

    it('should calculate multiplier based on ROI', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'High ROI Product',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 100, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.systemConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        key: 'system_config',
        value: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.systemConfig.update.mockResolvedValue({});

      const result = await service.scaleWinners(2.0);

      expect(result.products[0].multiplier).toBeGreaterThan(1.0);
    });

    it('should cap videos per week at 14 (2 per day)', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Viral Product',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 1000, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.systemConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        key: 'system_config',
        value: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.systemConfig.update.mockResolvedValue({});

      await service.scaleWinners(2.0);

      expect(mockPrismaService.systemConfig.update).toHaveBeenCalled();
      const updateCall = mockPrismaService.systemConfig.update.mock.calls[0][0];
      const configData = JSON.parse(updateCall.data.value);
      const productConfig = configData.products['prod-1'];

      expect(productConfig.videosPerWeek).toBeLessThanOrEqual(14);
    });

    it('should set priority to high for scaled products', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Winner',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 100, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.systemConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        key: 'system_config',
        value: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.systemConfig.update.mockResolvedValue({});

      await service.scaleWinners(2.0);

      const updateCall = mockPrismaService.systemConfig.update.mock.calls[0][0];
      const configData = JSON.parse(updateCall.data.value);
      const productConfig = configData.products['prod-1'];

      expect(productConfig.priority).toBe('high');
    });

    it('should enable auto-scale flag', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Winner',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 100, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.systemConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        key: 'system_config',
        value: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.systemConfig.update.mockResolvedValue({});

      await service.scaleWinners(2.0);

      const updateCall = mockPrismaService.systemConfig.update.mock.calls[0][0];
      const configData = JSON.parse(updateCall.data.value);
      const productConfig = configData.products['prod-1'];

      expect(productConfig.autoScale).toBe(true);
    });

    it('should create system config if it does not exist', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Winner',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 100, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.systemConfig.findFirst.mockResolvedValue(null);
      mockPrismaService.systemConfig.create.mockResolvedValue({});

      await service.scaleWinners(2.0);

      expect(mockPrismaService.systemConfig.create).toHaveBeenCalled();
    });

    it('should handle products with no videos', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Winner with no videos',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 100, date: new Date() }),
          videos: [],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.scaleWinners(2.0);

      expect(result.scaled).toBe(0);
    });
  });

  describe('calculateScaleMultiplier', () => {
    it('should return 2.0 for ROI > 5.0', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Extremely High ROI',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 200, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.systemConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        key: 'system_config',
        value: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.systemConfig.update.mockResolvedValue({});

      const result = await service.scaleWinners(2.0);

      expect(result.products[0].multiplier).toBe(2.0);
    });

    it('should return 1.5 for ROI > 3.0 and <= 5.0', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'High ROI',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 0.1215, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.systemConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        key: 'system_config',
        value: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.systemConfig.update.mockResolvedValue({});

      const result = await service.scaleWinners(2.0);

      expect(result.products[0].multiplier).toBe(1.5);
    });

    it('should return 1.3 for ROI > 2.0 and <= 3.0', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Good ROI',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 0.0945, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.systemConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        key: 'system_config',
        value: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.systemConfig.update.mockResolvedValue({});

      const result = await service.scaleWinners(2.0);

      expect(result.products[0].multiplier).toBe(1.3);
    });
  });

  describe('getRecommendations', () => {
    it('should return scaling recommendations for high ROI products', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Winner 1',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 100, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
        {
          id: 'prod-2',
          title: 'Winner 2',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 150, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const recommendations = await service.getRecommendations();

      expect(recommendations).toHaveLength(2);
      expect(recommendations[0]).toHaveProperty('productId');
      expect(recommendations[0]).toHaveProperty('productTitle');
      expect(recommendations[0]).toHaveProperty('roi');
      expect(recommendations[0]).toHaveProperty('currentVideos');
      expect(recommendations[0]).toHaveProperty('recommendedVideos');
      expect(recommendations[0]).toHaveProperty('multiplier');
      expect(recommendations[0]).toHaveProperty('action');
      expect(recommendations[0].action).toBe('scale');
    });

    it('should not return recommendations for low ROI products', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Low ROI Product',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 0.001, date: new Date() }),
          videos: [{ id: 'v1' }, { id: 'v2' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const recommendations = await service.getRecommendations();

      expect(recommendations).toHaveLength(0);
    });

    it('should sort recommendations by ROI (highest first)', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Lower ROI',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 25, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
        {
          id: 'prod-2',
          title: 'Higher ROI',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 100, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const recommendations = await service.getRecommendations();

      expect(recommendations[0].productTitle).toBe('Higher ROI');
      expect(recommendations[1].productTitle).toBe('Lower ROI');
    });

    it('should calculate recommended videos correctly', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Winner',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 100, date: new Date() }),
          videos: Array(5).fill({ id: 'v1' }),
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const recommendations = await service.getRecommendations();

      expect(recommendations[0].currentVideos).toBe(5);
      expect(recommendations[0].recommendedVideos).toBeGreaterThan(5);
    });

    it('should handle empty product list', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);

      const recommendations = await service.getRecommendations();

      expect(recommendations).toHaveLength(0);
    });

    it('should include ROI in recommendations', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Winner',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 100, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const recommendations = await service.getRecommendations();

      expect(recommendations[0].roi).toBeGreaterThan(2.0);
    });
  });

  describe('budget constraints', () => {
    it('should not exceed 2x scale limit', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Viral Product',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 1000, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.systemConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        key: 'system_config',
        value: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.systemConfig.update.mockResolvedValue({});

      const result = await service.scaleWinners(2.0);

      expect(result.products[0].multiplier).toBeLessThanOrEqual(2.0);
    });

    it('should handle multiple high ROI products', async () => {
      const mockProducts = Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `prod-${i}`,
          title: `Winner ${i}`,
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 100, date: new Date() }),
          videos: [{ id: 'v1' }],
        }));

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.systemConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        key: 'system_config',
        value: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.systemConfig.update.mockResolvedValue({});

      const result = await service.scaleWinners(2.0);

      expect(result.scaled).toBe(10);
    });
  });

  describe('ROI calculation', () => {
    it('should calculate ROI correctly', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Product',
          status: 'ACTIVE',
          analytics: [{ revenue: 100, date: new Date() }],
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const recommendations = await service.getRecommendations();

      // Revenue: 100, Cost: 0.27, ROI: (100 - 0.27) / 0.27
      expect(recommendations[0].roi).toBeGreaterThan(350);
    });

    it('should use correct cost per video (0.27)', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Product',
          status: 'ACTIVE',
          analytics: [{ revenue: 100, date: new Date() }],
          videos: Array(10).fill({ id: 'v1' }),
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const recommendations = await service.getRecommendations();

      // Cost should be 10 * 0.27 = 2.7
      expect(recommendations[0].roi).toBeGreaterThan(0);
    });

    it('should handle zero revenue', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Product',
          status: 'ACTIVE',
          analytics: [{ revenue: 0, date: new Date() }],
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const recommendations = await service.getRecommendations();

      expect(recommendations).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle products with no analytics', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Product',
          status: 'ACTIVE',
          analytics: [],
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.scaleWinners(2.0);

      expect(result.scaled).toBe(0);
    });

    it('should handle products with undefined analytics', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Product',
          status: 'ACTIVE',
          videos: [{ id: 'v1' }],
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.scaleWinners(2.0);

      expect(result.scaled).toBe(0);
    });

    it('should preserve existing config when updating', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          title: 'Winner',
          status: 'ACTIVE',
          analytics: Array(10).fill({ revenue: 100, date: new Date() }),
          videos: [{ id: 'v1' }],
        },
      ];

      const existingConfig = {
        id: 'config-1',
        key: 'system_config',
        value: JSON.stringify({
          existingField: 'value',
          products: {
            'other-prod': {
              priority: 'low',
            },
          },
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.systemConfig.findFirst.mockResolvedValue(existingConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue({});

      await service.scaleWinners(2.0);

      const updateCall = mockPrismaService.systemConfig.update.mock.calls[0][0];
      const configData = JSON.parse(updateCall.data.value);

      expect(configData.existingField).toBe('value');
      expect(configData.products['other-prod']).toBeDefined();
    });
  });
});
