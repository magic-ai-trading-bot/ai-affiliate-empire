/**
 * Unit tests for OrchestratorService
 * Comprehensive test suite covering workflow orchestration, state management, error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrchestratorService } from '@/modules/orchestrator/orchestrator.service';
import { PrismaService } from '@/common/database/prisma.service';
import { MockPrismaService, mockPrismaService } from '../../mocks/prisma.mock';
import * as temporalClient from '../../../src/temporal/client';

// Mock temporal client module
jest.mock('../../../src/temporal/client', () => ({
  getTemporalClient: jest.fn(),
  closeTemporalClient: jest.fn(),
}));

describe('OrchestratorService', () => {
  let service: OrchestratorService;
  let prisma: MockPrismaService;
  let configService: ConfigService;
  let mockTemporalClient: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Temporal client
    mockTemporalClient = {
      workflow: {
        start: jest.fn(),
        getHandle: jest.fn(),
      },
    };

    // Mock getTemporalClient to return mock client
    (temporalClient.getTemporalClient as jest.Mock).mockResolvedValue(mockTemporalClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                TEMPORAL_ADDRESS: 'localhost:7233',
                TEMPORAL_NAMESPACE: 'default',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OrchestratorService>(OrchestratorService);
    prisma = module.get<MockPrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    // Initialize service
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize Temporal client on module init', async () => {
      expect(temporalClient.getTemporalClient).toHaveBeenCalledWith(configService);
    });

    it('should handle Temporal client initialization failure gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (temporalClient.getTemporalClient as jest.Mock).mockRejectedValueOnce(
        new Error('Temporal unavailable'),
      );

      const newService = new OrchestratorService(configService, prisma as any);
      await newService.onModuleInit();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Temporal not available'),
        expect.any(String),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should close Temporal client on module destroy', async () => {
      await service.onModuleDestroy();
      expect(temporalClient.closeTemporalClient).toHaveBeenCalled();
    });
  });

  describe('startDailyControlLoop', () => {
    it('should start daily control loop workflow successfully', async () => {
      const mockWorkflowHandle = {
        workflowId: 'daily-2025-01-01',
        firstExecutionRunId: 'run-123',
      };

      mockTemporalClient.workflow.start.mockResolvedValue(mockWorkflowHandle);

      const dto = {
        maxProducts: 10,
        platforms: ['YOUTUBE', 'TIKTOK'],
      };

      const _result = await service.startDailyControlLoop(dto);

      expect(_result).toEqual({
        workflowId: 'daily-2025-01-01',
        runId: 'run-123',
        status: 'started',
      });
    });

    it('should use default parameters when not provided', async () => {
      const mockWorkflowHandle = {
        workflowId: 'daily-2025-01-01',
        firstExecutionRunId: 'run-123',
      };

      mockTemporalClient.workflow.start.mockResolvedValue(mockWorkflowHandle);

      const _result = await service.startDailyControlLoop({});

      expect(mockTemporalClient.workflow.start).toHaveBeenCalledWith('dailyControlLoop', {
        taskQueue: 'ai-affiliate-empire',
        workflowId: expect.stringContaining('daily-'),
        args: [
          {
            maxProducts: 10,
            platforms: ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'],
          },
        ],
      });
    });

    it('should generate workflow ID based on current date', async () => {
      const mockWorkflowHandle = {
        workflowId: 'daily-2025-01-01',
        firstExecutionRunId: 'run-123',
      };

      mockTemporalClient.workflow.start.mockResolvedValue(mockWorkflowHandle);

      await service.startDailyControlLoop({});

      const callArgs = mockTemporalClient.workflow.start.mock.calls[0][1];
      expect(callArgs.workflowId).toMatch(/^daily-\d{4}-\d{2}-\d{2}$/);
    });

    it('should return mock mode response when Temporal client unavailable', async () => {
      // Create service without Temporal client
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      (temporalClient.getTemporalClient as jest.Mock).mockRejectedValueOnce(
        new Error('Temporal unavailable'),
      );

      const newService = new OrchestratorService(configService, prisma as any);
      await newService.onModuleInit();

      const _result = await newService.startDailyControlLoop({});

      expect(_result.status).toBe('mock_mode');
      expect(_result.message).toContain('Temporal not configured');
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle workflow start errors', async () => {
      const error = new Error('Workflow start failed');
      mockTemporalClient.workflow.start.mockRejectedValue(error);

      await expect(service.startDailyControlLoop({})).rejects.toThrow('Workflow start failed');
    });

    it('should log workflow start', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockWorkflowHandle = {
        workflowId: 'daily-2025-01-01',
        firstExecutionRunId: 'run-123',
      };

      mockTemporalClient.workflow.start.mockResolvedValue(mockWorkflowHandle);

      await service.startDailyControlLoop({});

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting daily control loop'),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Daily control loop started'),
      );

      consoleSpy.mockRestore();
    });

    it('should accept custom maxProducts parameter', async () => {
      const mockWorkflowHandle = {
        workflowId: 'daily-2025-01-01',
        firstExecutionRunId: 'run-123',
      };

      mockTemporalClient.workflow.start.mockResolvedValue(mockWorkflowHandle);

      await service.startDailyControlLoop({ maxProducts: 20 });

      const callArgs = mockTemporalClient.workflow.start.mock.calls[0][1];
      expect(callArgs.args[0].maxProducts).toBe(20);
    });

    it('should accept custom platforms parameter', async () => {
      const mockWorkflowHandle = {
        workflowId: 'daily-2025-01-01',
        firstExecutionRunId: 'run-123',
      };

      mockTemporalClient.workflow.start.mockResolvedValue(mockWorkflowHandle);

      const platforms = ['YOUTUBE'];
      await service.startDailyControlLoop({ platforms });

      const callArgs = mockTemporalClient.workflow.start.mock.calls[0][1];
      expect(callArgs.args[0].platforms).toEqual(['YOUTUBE']);
    });

    it('should use correct task queue', async () => {
      const mockWorkflowHandle = {
        workflowId: 'daily-2025-01-01',
        firstExecutionRunId: 'run-123',
      };

      mockTemporalClient.workflow.start.mockResolvedValue(mockWorkflowHandle);

      await service.startDailyControlLoop({});

      const callArgs = mockTemporalClient.workflow.start.mock.calls[0][1];
      expect(callArgs.taskQueue).toBe('ai-affiliate-empire');
    });
  });

  describe('getWorkflowStatus', () => {
    it('should return workflow status successfully', async () => {
      const mockHandle = {
        describe: jest.fn().mockResolvedValue({
          status: { name: 'RUNNING' },
          startTime: new Date('2025-01-01T00:00:00Z'),
        }),
      };

      mockTemporalClient.workflow.getHandle.mockReturnValue(mockHandle);

      const _result = await service.getWorkflowStatus('daily-2025-01-01');

      expect(_result).toEqual({
        workflowId: 'daily-2025-01-01',
        status: 'RUNNING',
        startTime: new Date('2025-01-01T00:00:00Z'),
      });
    });

    it('should return mock mode when Temporal unavailable', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      (temporalClient.getTemporalClient as jest.Mock).mockRejectedValueOnce(
        new Error('Temporal unavailable'),
      );

      const newService = new OrchestratorService(configService, prisma as any);
      await newService.onModuleInit();

      const _result = await newService.getWorkflowStatus('daily-2025-01-01');

      expect(_result.status).toBe('mock_mode');

      consoleWarnSpy.mockRestore();
    });

    it('should handle errors when getting workflow status', async () => {
      const mockHandle = {
        describe: jest.fn().mockRejectedValue(new Error('Workflow not found')),
      };

      mockTemporalClient.workflow.getHandle.mockReturnValue(mockHandle);

      await expect(service.getWorkflowStatus('invalid-workflow-id')).rejects.toThrow(
        'Workflow not found',
      );
    });

    it('should get handle with correct workflow ID', async () => {
      const mockHandle = {
        describe: jest.fn().mockResolvedValue({
          status: { name: 'COMPLETED' },
          startTime: new Date(),
        }),
      };

      mockTemporalClient.workflow.getHandle.mockReturnValue(mockHandle);

      await service.getWorkflowStatus('workflow-123');

      expect(mockTemporalClient.workflow.getHandle).toHaveBeenCalledWith('workflow-123');
    });
  });

  describe('getWorkflowLogs', () => {
    it('should retrieve workflow logs from database', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          workflowId: 'daily-2025-01-01',
          status: 'COMPLETED',
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          workflowId: 'daily-2025-01-02',
          status: 'RUNNING',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.workflowExecution.findMany.mockResolvedValue(mockLogs);

      // Note: The service actually uses workflowLog, not workflowExecution
      // We need to add workflowLog to the mock
      const workflowLogMock = {
        findMany: jest.fn().mockResolvedValue(mockLogs),
      };
      (prisma as any).workflowLog = workflowLogMock;

      const _result = await service.getWorkflowLogs();

      expect(_result).toEqual(mockLogs);
      expect(workflowLogMock.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should limit logs by default to 50', async () => {
      const workflowLogMock = {
        findMany: jest.fn().mockResolvedValue([]),
      };
      (prisma as any).workflowLog = workflowLogMock;

      await service.getWorkflowLogs();

      expect(workflowLogMock.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should accept custom limit parameter', async () => {
      const workflowLogMock = {
        findMany: jest.fn().mockResolvedValue([]),
      };
      (prisma as any).workflowLog = workflowLogMock;

      await service.getWorkflowLogs(100);

      expect(workflowLogMock.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });

    it('should order logs by creation date descending', async () => {
      const workflowLogMock = {
        findMany: jest.fn().mockResolvedValue([]),
      };
      (prisma as any).workflowLog = workflowLogMock;

      await service.getWorkflowLogs();

      const callArgs = workflowLogMock.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('should return empty array when no logs exist', async () => {
      const workflowLogMock = {
        findMany: jest.fn().mockResolvedValue([]),
      };
      (prisma as any).workflowLog = workflowLogMock;

      const _result = await service.getWorkflowLogs();

      expect(_result).toEqual([]);
    });
  });

  describe('startWeeklyOptimization', () => {
    it('should start weekly optimization workflow successfully', async () => {
      const mockWorkflowHandle = {
        workflowId: 'weekly-2025-01-01',
      };

      mockTemporalClient.workflow.start.mockResolvedValue(mockWorkflowHandle);

      const _result = await service.startWeeklyOptimization();

      expect(_result).toEqual({
        workflowId: 'weekly-2025-01-01',
        status: 'started',
      });
    });

    it('should generate workflow ID based on current date', async () => {
      const mockWorkflowHandle = {
        workflowId: 'weekly-2025-01-01',
      };

      mockTemporalClient.workflow.start.mockResolvedValue(mockWorkflowHandle);

      await service.startWeeklyOptimization();

      const callArgs = mockTemporalClient.workflow.start.mock.calls[0][1];
      expect(callArgs.workflowId).toMatch(/^weekly-\d{4}-\d{2}-\d{2}$/);
    });

    it('should use correct workflow name and task queue', async () => {
      const mockWorkflowHandle = {
        workflowId: 'weekly-2025-01-01',
      };

      mockTemporalClient.workflow.start.mockResolvedValue(mockWorkflowHandle);

      await service.startWeeklyOptimization();

      expect(mockTemporalClient.workflow.start).toHaveBeenCalledWith('weeklyOptimization', {
        taskQueue: 'ai-affiliate-empire',
        workflowId: expect.stringContaining('weekly-'),
        args: [],
      });
    });

    it('should return mock mode when Temporal unavailable', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      (temporalClient.getTemporalClient as jest.Mock).mockRejectedValueOnce(
        new Error('Temporal unavailable'),
      );

      const newService = new OrchestratorService(configService, prisma as any);
      await newService.onModuleInit();

      const _result = await newService.startWeeklyOptimization();

      expect(_result.status).toBe('mock_mode');

      consoleWarnSpy.mockRestore();
    });

    it('should handle workflow start errors', async () => {
      const error = new Error('Weekly optimization failed');
      mockTemporalClient.workflow.start.mockRejectedValue(error);

      await expect(service.startWeeklyOptimization()).rejects.toThrow('Weekly optimization failed');
    });

    it('should log weekly optimization start', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockWorkflowHandle = {
        workflowId: 'weekly-2025-01-01',
      };

      mockTemporalClient.workflow.start.mockResolvedValue(mockWorkflowHandle);

      await service.startWeeklyOptimization();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting weekly optimization'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('scheduleDailyLoop', () => {
    it('should log scheduling message (not implemented)', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.scheduleDailyLoop();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Scheduling daily loop'));

      consoleSpy.mockRestore();
    });
  });

  describe('error recovery', () => {
    it('should handle concurrent workflow starts', async () => {
      const mockWorkflowHandle = {
        workflowId: 'daily-2025-01-01',
        firstExecutionRunId: 'run-123',
      };

      mockTemporalClient.workflow.start.mockResolvedValue(mockWorkflowHandle);

      const promises = [
        service.startDailyControlLoop({}),
        service.startDailyControlLoop({}),
        service.startDailyControlLoop({}),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.status).toBe('started');
      });
    });

    it('should handle Temporal connection timeout', async () => {
      const timeoutError = new Error('Connection timeout');
      mockTemporalClient.workflow.start.mockRejectedValue(timeoutError);

      await expect(service.startDailyControlLoop({})).rejects.toThrow('Connection timeout');
    });

    it('should recover from temporary Temporal failures', async () => {
      // First call fails, second succeeds
      mockTemporalClient.workflow.start
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          workflowId: 'daily-2025-01-01',
          firstExecutionRunId: 'run-123',
        });

      await expect(service.startDailyControlLoop({})).rejects.toThrow('Temporary failure');

      const _result = await service.startDailyControlLoop({});
      expect(_result.status).toBe('started');
    });
  });

  describe('workflow state management', () => {
    it('should handle multiple workflow status queries', async () => {
      const mockHandle = {
        describe: jest.fn().mockResolvedValue({
          status: { name: 'RUNNING' },
          startTime: new Date(),
        }),
      };

      mockTemporalClient.workflow.getHandle.mockReturnValue(mockHandle);

      const promises = [
        service.getWorkflowStatus('workflow-1'),
        service.getWorkflowStatus('workflow-2'),
        service.getWorkflowStatus('workflow-3'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockTemporalClient.workflow.getHandle).toHaveBeenCalledTimes(3);
    });

    it('should track different workflow statuses', async () => {
      const statuses = ['RUNNING', 'COMPLETED', 'FAILED'];

      for (const status of statuses) {
        const mockHandle = {
          describe: jest.fn().mockResolvedValue({
            status: { name: status },
            startTime: new Date(),
          }),
        };

        mockTemporalClient.workflow.getHandle.mockReturnValue(mockHandle);

        const _result = await service.getWorkflowStatus(`workflow-${status}`);
        expect(_result.status).toBe(status);
      }
    });
  });
});
