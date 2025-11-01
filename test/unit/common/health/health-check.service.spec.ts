import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Connection } from '@temporalio/client';
import axios from 'axios';
import { HealthCheckService } from '../../../../src/common/health/health-check.service';
import { PrismaService } from '../../../../src/common/database/prisma.service';
import { LoggerService } from '../../../../src/common/logging/logger.service';
import { ComponentStatus } from '../../../../src/common/health/dto/health-response.dto';

// Mock Temporal client
jest.mock('@temporalio/client', () => ({
  Connection: {
    connect: jest.fn(),
  },
}));

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HealthCheckService', () => {
  let service: HealthCheckService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        TEMPORAL_ADDRESS: 'localhost:7233',
        OPENAI_API_KEY: 'test-openai-key',
        ANTHROPIC_API_KEY: 'test-anthropic-key',
      };
      return config[key];
    }),
  };

  const mockLoggerService = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthCheckService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<HealthCheckService>(HealthCheckService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should set logger context', () => {
      expect(mockLoggerService.setContext).toHaveBeenCalledWith('HealthCheckService');
    });
  });

  describe('Database Health Check', () => {
    it('should return healthy status when database is accessible', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await service.checkDatabase();

      expect(result.status).toBe(ComponentStatus.HEALTHY);
      expect(result.message).toBe('Database connection successful');
      expect(result.details?.responseTime).toMatch(/\d+ms/);
      expect(result.lastCheck).toBeDefined();
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should return unhealthy status when database fails', async () => {
      const error = new Error('Connection refused');
      mockPrismaService.$queryRaw.mockRejectedValue(error);

      const result = await service.checkDatabase();

      expect(result.status).toBe(ComponentStatus.UNHEALTHY);
      expect(result.message).toBe('Database connection failed');
      expect(result.details?.error).toBe('Connection refused');
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Database health check failed',
        expect.any(String),
      );
    });

    it('should cache database health check results', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result1 = await service.checkDatabase();
      const result2 = await service.checkDatabase();

      expect(result1).toEqual(result2);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache after TTL expires', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      await service.checkDatabase();

      // Clear cache to simulate TTL expiration
      service.clearCache();

      await service.checkDatabase();

      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe('Temporal Health Check', () => {
    it('should return healthy status when Temporal is accessible', async () => {
      const mockConnection = {
        workflowService: {
          getSystemInfo: jest.fn().mockResolvedValue({}),
        },
        close: jest.fn(),
      };

      (Connection.connect as jest.Mock).mockResolvedValue(mockConnection);

      const result = await service.checkTemporal();

      expect(result.status).toBe(ComponentStatus.HEALTHY);
      expect(result.message).toBe('Temporal connection successful');
      expect(result.details?.address).toBe('localhost:7233');
      expect(result.details?.responseTime).toMatch(/\d+ms/);
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should return unhealthy status when Temporal connection fails', async () => {
      const error = new Error('Connection timeout');
      (Connection.connect as jest.Mock).mockRejectedValue(error);

      const result = await service.checkTemporal();

      expect(result.status).toBe(ComponentStatus.UNHEALTHY);
      expect(result.message).toBe('Temporal connection failed');
      expect(result.details?.error).toBe('Connection timeout');
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Temporal health check failed',
        expect.any(String),
      );
    });

    it('should use configured Temporal address', async () => {
      const mockConnection = {
        workflowService: {
          getSystemInfo: jest.fn().mockResolvedValue({}),
        },
        close: jest.fn(),
      };

      (Connection.connect as jest.Mock).mockResolvedValue(mockConnection);

      await service.checkTemporal();

      expect(Connection.connect).toHaveBeenCalledWith({
        address: 'localhost:7233',
      });
    });

    it('should cache Temporal health check results', async () => {
      const mockConnection = {
        workflowService: {
          getSystemInfo: jest.fn().mockResolvedValue({}),
        },
        close: jest.fn(),
      };

      (Connection.connect as jest.Mock).mockResolvedValue(mockConnection);

      const result1 = await service.checkTemporal();
      const result2 = await service.checkTemporal();

      expect(result1).toEqual(result2);
      expect(Connection.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('External APIs Health Check', () => {
    it('should return healthy when all APIs are available', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200, data: {} }) // OpenAI
        .mockResolvedValueOnce({ status: 200, data: {} }); // Anthropic

      const result = await service.checkExternalApis();

      expect(result.status).toBe(ComponentStatus.HEALTHY);
      expect(result.message).toBe('All external APIs are available');
      expect(result.details?.openai).toBe(true);
      expect(result.details?.anthropic).toBe(true);
    });

    it('should return degraded when some APIs are unavailable', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200, data: {} }) // OpenAI success
        .mockRejectedValueOnce(new Error('Timeout')); // Anthropic fail

      const result = await service.checkExternalApis();

      expect(result.status).toBe(ComponentStatus.DEGRADED);
      expect(result.message).toBe('1/2 external APIs are available');
      expect(result.details?.openai).toBe(true);
      expect(result.details?.anthropic).toBe(false);
    });

    it('should return unhealthy when all APIs are unavailable', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network error')) // OpenAI fail
        .mockRejectedValueOnce(new Error('Timeout')); // Anthropic fail

      const result = await service.checkExternalApis();

      expect(result.status).toBe(ComponentStatus.UNHEALTHY);
      expect(result.message).toBe('All external APIs are unavailable');
      expect(result.details?.openai).toBe(false);
      expect(result.details?.anthropic).toBe(false);
    });

    it('should check OpenAI API with correct headers', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      await service.checkExternalApis();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-openai-key' },
          timeout: 5000,
        }),
      );
    });

    it('should check Anthropic API with correct headers', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      await service.checkExternalApis();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/models',
        expect.objectContaining({
          headers: {
            'x-api-key': 'test-anthropic-key',
            'anthropic-version': '2023-06-01',
          },
          timeout: 5000,
        }),
      );
    });

    it('should skip APIs with mock keys', async () => {
      const mockConfigWithMockKeys = {
        get: jest.fn((key: string) => {
          const config: Record<string, string> = {
            OPENAI_API_KEY: 'mock',
            ANTHROPIC_API_KEY: 'mock',
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          HealthCheckService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: mockConfigWithMockKeys },
          { provide: LoggerService, useValue: mockLoggerService },
        ],
      }).compile();

      const serviceWithMock = module.get<HealthCheckService>(HealthCheckService);
      const result = await serviceWithMock.checkExternalApis();

      expect(result.status).toBe(ComponentStatus.UNHEALTHY);
      expect(result.details?.openai).toBe(false);
      expect(result.details?.anthropic).toBe(false);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should log warnings for failed API checks', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('OpenAI error'))
        .mockRejectedValueOnce(new Error('Anthropic error'));

      await service.checkExternalApis();

      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        'OpenAI API health check failed',
        'OpenAI error',
      );
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        'Anthropic API health check failed',
        'Anthropic error',
      );
    });

    it('should cache external API health check results', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const result1 = await service.checkExternalApis();
      const result2 = await service.checkExternalApis();

      expect(result1).toEqual(result2);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2); // 2 calls for first check only
    });
  });

  describe('Cache Management', () => {
    it('should clear all cached health checks', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      // Populate cache
      await service.checkDatabase();
      await service.checkExternalApis();

      // Clear cache
      service.clearCache();

      // Check that new calls are made
      await service.checkDatabase();
      await service.checkExternalApis();

      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(2);
      expect(mockedAxios.get.mock.calls.length).toBeGreaterThan(2);
    });

    it('should respect cache TTL for database checks', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result1 = await service.checkDatabase();
      const result2 = await service.checkDatabase();

      expect(result1.lastCheck).toBe(result2.lastCheck);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should respect cache TTL for Temporal checks', async () => {
      const mockConnection = {
        workflowService: {
          getSystemInfo: jest.fn().mockResolvedValue({}),
        },
        close: jest.fn(),
      };

      (Connection.connect as jest.Mock).mockResolvedValue(mockConnection);

      const result1 = await service.checkTemporal();
      const result2 = await service.checkTemporal();

      expect(result1.lastCheck).toBe(result2.lastCheck);
      expect(Connection.connect).toHaveBeenCalledTimes(1);
    });

    it('should respect cache TTL for external API checks', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200, data: {} });

      const result1 = await service.checkExternalApis();
      const result2 = await service.checkExternalApis();

      expect(result1.lastCheck).toBe(result2.lastCheck);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2); // 2 APIs, called once each
    });
  });

  describe('Error Handling', () => {
    it('should handle database query errors gracefully', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Query timeout'));

      const result = await service.checkDatabase();

      expect(result.status).toBe(ComponentStatus.UNHEALTHY);
      expect(result.details?.error).toBeDefined();
    });

    it('should handle Temporal connection errors gracefully', async () => {
      (Connection.connect as jest.Mock).mockRejectedValue(
        new Error('Service unavailable'),
      );

      const result = await service.checkTemporal();

      expect(result.status).toBe(ComponentStatus.UNHEALTHY);
      expect(result.details?.error).toBeDefined();
    });

    it('should handle external API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await service.checkExternalApis();

      expect(result.status).toBe(ComponentStatus.UNHEALTHY);
    });

    it('should include error details in unhealthy responses', async () => {
      const testError = new Error('Specific database error');
      mockPrismaService.$queryRaw.mockRejectedValue(testError);

      const result = await service.checkDatabase();

      expect(result.details?.error).toBe('Specific database error');
    });
  });

  describe('Response Time Tracking', () => {
    it('should track database response time', async () => {
      mockPrismaService.$queryRaw.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve([{ '?column?': 1 }]), 50),
          ),
      );

      const result = await service.checkDatabase();

      expect(result.details?.responseTime).toMatch(/\d+ms/);
      const responseTime = parseInt(result.details?.responseTime);
      expect(responseTime).toBeGreaterThanOrEqual(50);
    });

    it('should track Temporal response time', async () => {
      const mockConnection = {
        workflowService: {
          getSystemInfo: jest.fn().mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 30)),
          ),
        },
        close: jest.fn(),
      };

      (Connection.connect as jest.Mock).mockResolvedValue(mockConnection);

      const result = await service.checkTemporal();

      expect(result.details?.responseTime).toMatch(/\d+ms/);
      const responseTime = parseInt(result.details?.responseTime);
      expect(responseTime).toBeGreaterThanOrEqual(30);
    });
  });
});
