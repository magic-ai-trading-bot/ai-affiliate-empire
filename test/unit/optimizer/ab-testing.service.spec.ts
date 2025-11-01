/**
 * Unit tests for ABTestingService
 * Comprehensive tests covering A/B test creation, analysis, and result tracking
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ABTestingService } from '@/modules/optimizer/services/ab-testing.service';
import { PrismaService } from '@/common/database/prisma.service';
import { MockPrismaService, mockPrismaService } from '../../mocks/prisma.mock';

describe('ABTestingService', () => {
  let service: ABTestingService;
  let _prisma: MockPrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ABTestingService,
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ABTestingService>(ABTestingService);
    prisma = module.get<MockPrismaService>(PrismaService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createTest', () => {
    it('should create new A/B test successfully', async () => {
      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: [] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue({
        ...mockConfig,
        value: JSON.stringify({ abTests: [expect.any(Object)] }),
      });

      const params = {
        name: 'Test CTA Position',
        variantA: { position: 'top' },
        variantB: { position: 'bottom' },
        metric: 'conversions',
      };

      const result = await service.createTest(params);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', 'Test CTA Position');
      expect(result).toHaveProperty('variantA', { position: 'top' });
      expect(result).toHaveProperty('variantB', { position: 'bottom' });
      expect(result).toHaveProperty('metric', 'conversions');
      expect(result).toHaveProperty('status', 'running');
    });

    it('should generate unique test ID with timestamp', async () => {
      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: [] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const params = {
        name: 'Test 1',
        variantA: {},
        variantB: {},
        metric: 'ctr',
      };

      const result = await service.createTest(params);

      expect(result.id).toMatch(/^test_\d+$/);
    });

    it('should create config if none exists', async () => {
      mockPrismaService.systemConfig.findFirst.mockResolvedValue(null);
      mockPrismaService.systemConfig.create.mockResolvedValue({
        id: 'new-config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({}),
        createdAt: new Date(),
      });
      mockPrismaService.systemConfig.update.mockResolvedValue({
        id: 'new-config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: [expect.any(Object)] }),
        createdAt: new Date(),
      });

      const params = {
        name: 'Test 1',
        variantA: {},
        variantB: {},
        metric: 'ctr',
      };

      await service.createTest(params);

      expect(mockPrismaService.systemConfig.create).toHaveBeenCalled();
    });

    it('should add test to existing tests array', async () => {
      const existingTest = {
        id: 'test_123',
        name: 'Existing Test',
        variantA: {},
        variantB: {},
        metric: 'ctr',
        status: 'running',
      };

      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: [existingTest] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const params = {
        name: 'New Test',
        variantA: {},
        variantB: {},
        metric: 'conversions',
      };

      await service.createTest(params);

      const updateCall = mockPrismaService.systemConfig.update.mock.calls[0][0];
      const savedData = JSON.parse(updateCall.data.value);

      expect(savedData.abTests).toHaveLength(2);
      expect(savedData.abTests[0]).toEqual(existingTest);
    });

    it('should log test creation', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: [] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const params = {
        name: 'Test CTA',
        variantA: {},
        variantB: {},
        metric: 'ctr',
      };

      await service.createTest(params);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Creating A/B test'));

      consoleSpy.mockRestore();
    });
  });

  describe('analyzeTests', () => {
    it('should analyze all running tests', async () => {
      const runningTests = [
        {
          id: 'test_1',
          name: 'Test 1',
          variantA: {},
          variantB: {},
          metric: 'ctr',
          status: 'running',
        },
        {
          id: 'test_2',
          name: 'Test 2',
          variantA: {},
          variantB: {},
          metric: 'conversions',
          status: 'running',
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: runningTests }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.analyzeTests();

      expect(result.analyzed).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    it('should skip completed tests', async () => {
      const tests = [
        {
          id: 'test_1',
          name: 'Test 1',
          variantA: {},
          variantB: {},
          metric: 'ctr',
          status: 'running',
        },
        {
          id: 'test_2',
          name: 'Test 2',
          variantA: {},
          variantB: {},
          metric: 'conversions',
          status: 'completed',
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: tests }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.analyzeTests();

      expect(result.analyzed).toBe(1);
    });

    it('should mark test as completed when confidence > 95', async () => {
      const tests = [
        {
          id: 'test_1',
          name: 'Test 1',
          variantA: {},
          variantB: {},
          metric: 'ctr',
          status: 'running',
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: tests }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      // Mock Math.random to ensure high confidence
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.9).mockReturnValueOnce(0.1);

      await service.analyzeTests();

      const updateCall = mockPrismaService.systemConfig.update.mock.calls[0][0];
      const savedData = JSON.parse(updateCall.data.value);

      expect(savedData.abTests[0].status).toBe('completed');
      expect(savedData.abTests[0].results.confidence).toBeGreaterThan(95);

      jest.spyOn(Math, 'random').mockRestore();
    });

    it('should include test results in analysis', async () => {
      const tests = [
        {
          id: 'test_1',
          name: 'Test 1',
          variantA: {},
          variantB: {},
          metric: 'ctr',
          status: 'running',
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: tests }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.analyzeTests();

      expect(result.results[0]).toHaveProperty('testId');
      expect(result.results[0]).toHaveProperty('testName');
      expect(result.results[0]).toHaveProperty('variantAValue');
      expect(result.results[0]).toHaveProperty('variantBValue');
      expect(result.results[0]).toHaveProperty('winner');
      expect(result.results[0]).toHaveProperty('confidence');
      expect(result.results[0]).toHaveProperty('recommendation');
    });

    it('should handle empty tests array', async () => {
      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: [] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.analyzeTests();

      expect(result.analyzed).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should log analysis completion', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: [] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      await service.analyzeTests();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Analyzing A/B tests'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Analyzed 0 A/B tests'));

      consoleSpy.mockRestore();
    });
  });

  describe('getResults', () => {
    it('should return all test results', async () => {
      const tests = [
        {
          id: 'test_1',
          name: 'Test 1',
          variantA: {},
          variantB: {},
          metric: 'ctr',
          status: 'running',
          results: { winner: 'A', confidence: 85 },
        },
        {
          id: 'test_2',
          name: 'Test 2',
          variantA: {},
          variantB: {},
          metric: 'conversions',
          status: 'completed',
          results: { winner: 'B', confidence: 98 },
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: tests }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);

      const result = await service.getResults();

      expect(result.total).toBe(2);
      expect(result.running).toBe(1);
      expect(result.completed).toBe(1);
      expect(result.tests).toHaveLength(2);
    });

    it('should return summary with counts', async () => {
      const tests = [
        { id: 'test_1', name: 'Test 1', status: 'running' },
        { id: 'test_2', name: 'Test 2', status: 'running' },
        { id: 'test_3', name: 'Test 3', status: 'completed' },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: tests }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);

      const result = await service.getResults();

      expect(result.total).toBe(3);
      expect(result.running).toBe(2);
      expect(result.completed).toBe(1);
    });

    it('should handle empty tests', async () => {
      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: [] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);

      const result = await service.getResults();

      expect(result.total).toBe(0);
      expect(result.running).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.tests).toHaveLength(0);
    });

    it('should include test results in output', async () => {
      const tests = [
        {
          id: 'test_1',
          name: 'Test 1',
          status: 'completed',
          results: { winner: 'A', confidence: 99 },
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: tests }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);

      const result = await service.getResults();

      expect(result.tests[0].results).toEqual({ winner: 'A', confidence: 99 });
    });
  });

  describe('createCommonTests', () => {
    it('should create 4 common A/B tests', async () => {
      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: [] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.createCommonTests();

      expect(result.created).toBe(4);
      expect(result.tests).toHaveLength(4);
    });

    it('should create script tone test', async () => {
      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: [] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.createCommonTests();

      const toneTest = result.tests.find((t) => t.name.includes('Script Tone'));
      expect(toneTest).toBeDefined();
      expect(toneTest?.variantA).toHaveProperty('tone', 'enthusiastic');
      expect(toneTest?.variantB).toHaveProperty('tone', 'educational');
    });

    it('should create CTA position test', async () => {
      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: [] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.createCommonTests();

      const ctaTest = result.tests.find((t) => t.name.includes('CTA Position'));
      expect(ctaTest).toBeDefined();
      expect(ctaTest?.metric).toBe('conversions');
    });

    it('should create video length test', async () => {
      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: [] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.createCommonTests();

      const lengthTest = result.tests.find((t) => t.name.includes('Video Length'));
      expect(lengthTest).toBeDefined();
      expect(lengthTest?.variantA).toHaveProperty('duration', 30);
      expect(lengthTest?.variantB).toHaveProperty('duration', 60);
    });

    it('should create thumbnail style test', async () => {
      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: [] }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.createCommonTests();

      const thumbnailTest = result.tests.find((t) => t.name.includes('Thumbnail Style'));
      expect(thumbnailTest).toBeDefined();
      expect(thumbnailTest?.metric).toBe('views');
    });
  });

  describe('winner determination', () => {
    it('should determine winner based on higher value', async () => {
      const tests = [
        {
          id: 'test_1',
          name: 'Test 1',
          variantA: {},
          variantB: {},
          metric: 'ctr',
          status: 'running',
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: tests }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      // Mock to ensure variant A wins
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.9).mockReturnValueOnce(0.1);

      const result = await service.analyzeTests();

      expect(result.results[0].winner).toBe('A');

      jest.spyOn(Math, 'random').mockRestore();
    });

    it('should calculate confidence based on difference', async () => {
      const tests = [
        {
          id: 'test_1',
          name: 'Test 1',
          variantA: {},
          variantB: {},
          metric: 'ctr',
          status: 'running',
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: tests }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      const result = await service.analyzeTests();

      expect(result.results[0].confidence).toBeGreaterThanOrEqual(50);
      expect(result.results[0].confidence).toBeLessThanOrEqual(99);
    });

    it('should provide deployment recommendation for high confidence', async () => {
      const tests = [
        {
          id: 'test_1',
          name: 'Test 1',
          variantA: {},
          variantB: {},
          metric: 'ctr',
          status: 'running',
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: tests }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      // Ensure high confidence
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.99).mockReturnValueOnce(0.01);

      const result = await service.analyzeTests();

      expect(result.results[0].recommendation).toContain('Deploy variant');

      jest.spyOn(Math, 'random').mockRestore();
    });

    it('should recommend continued testing for low confidence', async () => {
      const tests = [
        {
          id: 'test_1',
          name: 'Test 1',
          variantA: {},
          variantB: {},
          metric: 'ctr',
          status: 'running',
        },
      ];

      const mockConfig = {
        id: 'config-1',
        key: 'ab_testing_config',
        value: JSON.stringify({ abTests: tests }),
        createdAt: new Date(),
      };

      mockPrismaService.systemConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.systemConfig.update.mockResolvedValue(mockConfig);

      // Ensure low confidence
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.5).mockReturnValueOnce(0.45);

      const result = await service.analyzeTests();

      expect(result.results[0].recommendation).toContain('Continue testing');

      jest.spyOn(Math, 'random').mockRestore();
    });
  });
});
