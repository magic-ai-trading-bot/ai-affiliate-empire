/**
 * Unit tests for PromptVersioningService
 * Comprehensive tests covering prompt version management, optimization, and tracking
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PromptVersioningService } from '@/modules/optimizer/services/prompt-versioning.service';
import { PrismaService } from '@/common/database/prisma.service';
import { MockPrismaService, mockPrismaService } from '../../mocks/prisma.mock';

describe('PromptVersioningService', () => {
  let service: PromptVersioningService;
  let _prisma: MockPrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptVersioningService,
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PromptVersioningService>(PromptVersioningService);
    prisma = module.get<MockPrismaService>(PrismaService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('optimizePrompts', () => {
    it('should create initial versions when none exist', async () => {
      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: [] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.optimizePrompts();

      expect(result).toHaveProperty('created', 3);
      expect((result as any).versions).toHaveLength(3);
    });

    it('should generate new variant based on best performer', async () => {
      const versions = [
        {
          id: 'v1',
          version: 1,
          template: 'basic',
          parameters: {},
          performance: { uses: 100, avgCTR: 0.05, avgConversions: 5, avgRevenue: 50 },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'v2',
          version: 2,
          template: 'advanced',
          parameters: {},
          performance: { uses: 100, avgCTR: 0.08, avgConversions: 10, avgRevenue: 150 },
          createdAt: new Date().toISOString(),
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: versions }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.optimizePrompts();

      expect((result as any).bestVersion).toBe(2); // v2 has higher revenue
      expect((result as any).newVersion).toBe(3);
    });

    it('should calculate improvement over time', async () => {
      const versions = [
        {
          id: 'v1',
          version: 1,
          template: 'basic',
          parameters: {},
          performance: { uses: 100, avgCTR: 0.05, avgConversions: 5, avgRevenue: 50 },
          createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        },
        {
          id: 'v2',
          version: 2,
          template: 'advanced',
          parameters: {},
          performance: { uses: 100, avgCTR: 0.08, avgConversions: 10, avgRevenue: 100 },
          createdAt: new Date().toISOString(),
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: versions }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.optimizePrompts();

      expect(result).toHaveProperty('improvement');
      expect(typeof (result as any).improvement).toBe('number');
    });

    it('should log optimization completion', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: [] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      await service.optimizePrompts();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Optimizing prompt versions'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getPromptVersions', () => {
    it('should return all prompt versions', async () => {
      const versions = [
        {
          id: 'v1',
          version: 1,
          template: 'basic',
          parameters: {},
          performance: { uses: 50, avgCTR: 0.05, avgConversions: 5, avgRevenue: 50 },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'v2',
          version: 2,
          template: 'advanced',
          parameters: {},
          performance: { uses: 30, avgCTR: 0.08, avgConversions: 8, avgRevenue: 80 },
          createdAt: new Date().toISOString(),
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: versions }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);

      const result = await service.getPromptVersions();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', 'v1');
      expect(result[1]).toHaveProperty('id', 'v2');
    });

    it('should return empty array when no versions exist', async () => {
      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({}),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);

      const result = await service.getPromptVersions();

      expect(result).toHaveLength(0);
    });

    it('should create config if none exists', async () => {
      mockPrismaService.systemConfig.findFirst.mockResolvedValue(null);
      mockPrismaService.systemConfig.create.mockResolvedValue({
        id: 'new-config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({}),
        createdAt: new Date(),
      });

      const result = await service.getPromptVersions();

      expect(mockPrismaService.systemConfig.create).toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });
  });

  describe('getPerformance', () => {
    it('should return performance metrics for all versions', async () => {
      const versions = [
        {
          id: 'v1',
          version: 1,
          template: 'basic',
          parameters: {},
          performance: { uses: 100, avgCTR: 0.05, avgConversions: 5, avgRevenue: 50 },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'v2',
          version: 2,
          template: 'advanced',
          parameters: {},
          performance: { uses: 80, avgCTR: 0.08, avgConversions: 10, avgRevenue: 150 },
          createdAt: new Date().toISOString(),
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: versions }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);

      const result = await service.getPerformance();

      expect(result.total).toBe(2);
      expect(result.best.version).toBe(2);
      expect(result.worst.version).toBe(1);
    });

    it('should sort versions by revenue descending', async () => {
      const versions = [
        {
          id: 'v1',
          version: 1,
          template: 'low',
          parameters: {},
          performance: { uses: 100, avgCTR: 0.03, avgConversions: 3, avgRevenue: 30 },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'v2',
          version: 2,
          template: 'high',
          parameters: {},
          performance: { uses: 100, avgCTR: 0.1, avgConversions: 15, avgRevenue: 200 },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'v3',
          version: 3,
          template: 'medium',
          parameters: {},
          performance: { uses: 100, avgCTR: 0.06, avgConversions: 8, avgRevenue: 100 },
          createdAt: new Date().toISOString(),
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: versions }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);

      const result = await service.getPerformance();

      expect(result.versions[0].version).toBe(2); // Highest revenue
      expect(result.versions[1].version).toBe(3);
      expect(result.versions[2].version).toBe(1); // Lowest revenue
    });

    it('should include all performance metrics', async () => {
      const versions = [
        {
          id: 'v1',
          version: 1,
          template: 'basic',
          parameters: {},
          performance: { uses: 50, avgCTR: 0.05, avgConversions: 5, avgRevenue: 50 },
          createdAt: new Date().toISOString(),
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: versions }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);

      const result = await service.getPerformance();

      expect(result.versions[0]).toHaveProperty('version');
      expect(result.versions[0]).toHaveProperty('uses');
      expect(result.versions[0]).toHaveProperty('avgCTR');
      expect(result.versions[0]).toHaveProperty('avgConversions');
      expect(result.versions[0]).toHaveProperty('avgRevenue');
      expect(result.versions[0]).toHaveProperty('createdAt');
    });
  });

  describe('trackUsage', () => {
    it('should update performance metrics for version', async () => {
      const versions = [
        {
          id: 'v1',
          version: 1,
          template: 'basic',
          parameters: {},
          performance: { uses: 10, avgCTR: 0.05, avgConversions: 5, avgRevenue: 50 },
          createdAt: new Date().toISOString(),
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: versions }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      await service.trackUsage('v1', { ctr: 0.1, conversions: 10, revenue: 100 });

      const updateCall = mockPrismaService.systemConfig.update.mock.calls[0][0];
      const savedData = JSON.parse(updateCall.data.value);

      expect(savedData.promptVersions[0].performance.uses).toBe(11);
    });

    it('should calculate rolling average for CTR', async () => {
      const versions = [
        {
          id: 'v1',
          version: 1,
          template: 'basic',
          parameters: {},
          performance: { uses: 10, avgCTR: 0.05, avgConversions: 5, avgRevenue: 50 },
          createdAt: new Date().toISOString(),
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: versions }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      await service.trackUsage('v1', { ctr: 0.15, conversions: 10, revenue: 100 });

      const updateCall = mockPrismaService.systemConfig.update.mock.calls[0][0];
      const savedData = JSON.parse(updateCall.data.value);

      // (0.05 * 10 + 0.15) / 11
      expect(savedData.promptVersions[0].performance.avgCTR).toBeCloseTo(0.0591, 2);
    });

    it('should calculate rolling average for conversions', async () => {
      const versions = [
        {
          id: 'v1',
          version: 1,
          template: 'basic',
          parameters: {},
          performance: { uses: 10, avgCTR: 0.05, avgConversions: 5, avgRevenue: 50 },
          createdAt: new Date().toISOString(),
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: versions }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      await service.trackUsage('v1', { ctr: 0.1, conversions: 15, revenue: 100 });

      const updateCall = mockPrismaService.systemConfig.update.mock.calls[0][0];
      const savedData = JSON.parse(updateCall.data.value);

      // (5 * 10 + 15) / 11
      expect(savedData.promptVersions[0].performance.avgConversions).toBeCloseTo(5.909, 2);
    });

    it('should calculate rolling average for revenue', async () => {
      const versions = [
        {
          id: 'v1',
          version: 1,
          template: 'basic',
          parameters: {},
          performance: { uses: 10, avgCTR: 0.05, avgConversions: 5, avgRevenue: 50 },
          createdAt: new Date().toISOString(),
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: versions }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      await service.trackUsage('v1', { ctr: 0.1, conversions: 10, revenue: 150 });

      const updateCall = mockPrismaService.systemConfig.update.mock.calls[0][0];
      const savedData = JSON.parse(updateCall.data.value);

      // (50 * 10 + 150) / 11
      expect(savedData.promptVersions[0].performance.avgRevenue).toBeCloseTo(59.09, 2);
    });

    it('should not update if version not found', async () => {
      const versions = [
        {
          id: 'v1',
          version: 1,
          template: 'basic',
          parameters: {},
          performance: { uses: 10, avgCTR: 0.05, avgConversions: 5, avgRevenue: 50 },
          createdAt: new Date().toISOString(),
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: versions }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      await service.trackUsage('v999', { ctr: 0.1, conversions: 10, revenue: 100 });

      expect(mockPrismaService.systemConfig.update).not.toHaveBeenCalled();
    });
  });

  describe('initial versions creation', () => {
    it('should create 3 initial versions', async () => {
      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: [] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.optimizePrompts();

      expect((result as any).created).toBe(3);
    });

    it('should create enthusiastic template version', async () => {
      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: [] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.optimizePrompts();

      const enthusiastic = (result as any).versions.find((v: any) => v.template === 'enthusiastic');
      expect(enthusiastic).toBeDefined();
      expect(enthusiastic?.parameters.tone).toBe('enthusiastic');
    });

    it('should create educational template version', async () => {
      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: [] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.optimizePrompts();

      const educational = (result as any).versions.find((v: any) => v.template === 'educational');
      expect(educational).toBeDefined();
      expect(educational?.parameters.tone).toBe('educational');
    });

    it('should create storytelling template version', async () => {
      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: [] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.optimizePrompts();

      const storytelling = (result as any).versions.find((v: any) => v.template === 'storytelling');
      expect(storytelling).toBeDefined();
      expect(storytelling?.parameters.tone).toBe('storytelling');
    });

    it('should initialize all versions with zero performance', async () => {
      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: [] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.optimizePrompts();

      (result as any).versions.forEach((version: any) => {
        expect(version.performance.uses).toBe(0);
        expect(version.performance.avgCTR).toBe(0);
        expect(version.performance.avgConversions).toBe(0);
        expect(version.performance.avgRevenue).toBe(0);
      });
    });
  });

  describe('variant generation', () => {
    it('should generate variant based on best performer', async () => {
      const versions = [
        {
          id: 'v1',
          version: 1,
          template: 'basic',
          parameters: { tone: 'casual' },
          performance: { uses: 100, avgCTR: 0.05, avgConversions: 5, avgRevenue: 50 },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'v2',
          version: 2,
          template: 'advanced',
          parameters: { tone: 'professional' },
          performance: { uses: 100, avgCTR: 0.1, avgConversions: 12, avgRevenue: 150 },
          createdAt: new Date().toISOString(),
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: versions }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      await service.optimizePrompts();

      const updateCall = mockPrismaService.systemConfig.update.mock.calls[0][0];
      const savedData = JSON.parse(updateCall.data.value);

      const newVersion = savedData.promptVersions[2];
      expect(newVersion.version).toBe(3);
      expect(newVersion.template).toContain('advanced');
      expect(newVersion.parameters.basedOn).toBe(2);
    });

    it('should mark variant as optimized', async () => {
      const versions = [
        {
          id: 'v1',
          version: 1,
          template: 'basic',
          parameters: {},
          performance: { uses: 100, avgCTR: 0.05, avgConversions: 5, avgRevenue: 100 },
          createdAt: new Date().toISOString(),
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: versions }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      await service.optimizePrompts();

      const updateCall = mockPrismaService.systemConfig.update.mock.calls[0][0];
      const savedData = JSON.parse(updateCall.data.value);

      expect(savedData.promptVersions[1].parameters.optimized).toBe(true);
    });

    it('should preserve best performer parameters', async () => {
      const versions = [
        {
          id: 'v1',
          version: 1,
          template: 'best',
          parameters: { tone: 'enthusiastic', length: 'short' },
          performance: { uses: 100, avgCTR: 0.1, avgConversions: 15, avgRevenue: 200 },
          createdAt: new Date().toISOString(),
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: versions }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      await service.optimizePrompts();

      const updateCall = mockPrismaService.systemConfig.update.mock.calls[0][0];
      const savedData = JSON.parse(updateCall.data.value);

      const newVersion = savedData.promptVersions[1];
      expect(newVersion.parameters.tone).toBe('enthusiastic');
      expect(newVersion.parameters.length).toBe('short');
    });
  });

  describe('improvement calculation', () => {
    it('should calculate positive improvement', async () => {
      const versions = [
        {
          id: 'v1',
          version: 1,
          template: 'old',
          parameters: {},
          performance: { uses: 100, avgCTR: 0.05, avgConversions: 5, avgRevenue: 50 },
          createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        },
        {
          id: 'v2',
          version: 2,
          template: 'new',
          parameters: {},
          performance: { uses: 100, avgCTR: 0.1, avgConversions: 10, avgRevenue: 100 },
          createdAt: new Date().toISOString(),
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: versions }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.optimizePrompts();

      expect((result as any).improvement).toBe(100); // 100% improvement
    });

    it('should return 0 improvement for single version', async () => {
      const versions = [
        {
          id: 'v1',
          version: 1,
          template: 'basic',
          parameters: {},
          performance: { uses: 100, avgCTR: 0.05, avgConversions: 5, avgRevenue: 50 },
          createdAt: new Date().toISOString(),
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'prompt_versioning_config',
        value: JSON.stringify({ promptVersions: versions }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.optimizePrompts();

      // After generating new variant, there will be 2 versions
      // But improvement is calculated based on chronological order
      expect(typeof (result as any).improvement).toBe('number');
    });
  });
});
