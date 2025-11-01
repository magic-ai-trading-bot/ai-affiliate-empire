import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { SentryService } from '../../../../src/common/monitoring/sentry.service';
import { LoggerService } from '../../../../src/common/logging/logger.service';

// Mock Sentry module
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn((callback) =>
    callback({
      setTag: jest.fn(),
      setExtra: jest.fn(),
      setUser: jest.fn(),
    }),
  ),
  startSpan: jest.fn((config, callback) => callback()),
  addBreadcrumb: jest.fn(),
  setContext: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  close: jest.fn().mockResolvedValue(true),
  flush: jest.fn().mockResolvedValue(true),
  httpIntegration: jest.fn(),
  fsIntegration: jest.fn(),
  onUncaughtExceptionIntegration: jest.fn(),
  onUnhandledRejectionIntegration: jest.fn(),
}));

describe('SentryService', () => {
  let service: SentryService;

  const mockLoggerService = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    // Reset specific Sentry mocks but keep their implementation
    (Sentry.withScope as jest.Mock).mockImplementation((callback) => {
      const scope = {
        setTag: jest.fn(),
        setExtra: jest.fn(),
        setUser: jest.fn(),
      };
      callback(scope);
      return scope;
    });
    (Sentry.startSpan as jest.Mock).mockImplementation((config, callback) => callback());
  });

  describe('Initialization - Enabled', () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          SENTRY_DSN: 'https://test@sentry.io/123456',
          SENTRY_ENVIRONMENT: 'test',
          SENTRY_TRACES_SAMPLE_RATE: '0.2',
        };
        return config[key];
      }),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SentryService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: LoggerService, useValue: mockLoggerService },
        ],
      }).compile();

      service = module.get<SentryService>(SentryService);
      // onModuleInit is called when the service is instantiated
      service.onModuleInit();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize Sentry with correct config', () => {
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.io/123456',
          environment: 'test',
          tracesSampleRate: 0.2,
        }),
      );
    });

    it('should configure Sentry integrations', () => {
      const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
      expect(initCall.integrations).toBeDefined();
      expect(Array.isArray(initCall.integrations)).toBe(true);
      expect(initCall.integrations.length).toBeGreaterThanOrEqual(4);
    });

    it('should filter sensitive headers in beforeSend', () => {
      const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      const event = {
        request: {
          headers: {
            authorization: 'Bearer secret-token',
            cookie: 'session=abc123',
            'content-type': 'application/json',
          },
        },
      };

      const result = beforeSend(event);

      expect(result.request.headers.authorization).toBeUndefined();
      expect(result.request.headers.cookie).toBeUndefined();
      expect(result.request.headers['content-type']).toBe('application/json');
    });

    it('should log successful initialization', () => {
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('Sentry initialized'),
      );
    });

    it('should set logger context', () => {
      expect(mockLoggerService.setContext).toHaveBeenCalledWith('SentryService');
    });
  });

  describe('Initialization - Disabled', () => {
    const mockConfigServiceNoSentry = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          SENTRY_DSN: '',
          SENTRY_ENVIRONMENT: 'test',
        };
        return config[key];
      }),
    };

    let initCallsBeforeTest: number;

    beforeEach(async () => {
      initCallsBeforeTest = (Sentry.init as jest.Mock).mock.calls.length;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SentryService,
          { provide: ConfigService, useValue: mockConfigServiceNoSentry },
          { provide: LoggerService, useValue: mockLoggerService },
        ],
      }).compile();

      service = module.get<SentryService>(SentryService);
      service.onModuleInit();
    });

    it('should not initialize Sentry when DSN is missing', () => {
      const currentCalls = (Sentry.init as jest.Mock).mock.calls.length;

      // Sentry.init should not have been called during this module initialization
      expect(currentCalls).toBe(initCallsBeforeTest);
    });

    it('should log warning when Sentry is disabled', () => {
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        'Sentry DSN not configured - error tracking disabled',
      );
    });

    it('should return undefined when capturing exception while disabled', () => {
      const result = service.captureException(new Error('test error'));
      expect(result).toBeUndefined();
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('should return undefined when capturing message while disabled', () => {
      const result = service.captureMessage('test message');
      expect(result).toBeUndefined();
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });
  });

  describe('Exception Capturing - Enabled', () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          SENTRY_DSN: 'https://test@sentry.io/123456',
          SENTRY_ENVIRONMENT: 'production',
          SENTRY_TRACES_SAMPLE_RATE: '0.1',
        };
        return config[key];
      }),
    };

    beforeEach(async () => {
      // Clear mocks but not Sentry.init (that was called during module init)
      (Sentry.captureException as jest.Mock).mockClear();
      (Sentry.captureMessage as jest.Mock).mockClear();
      (Sentry.addBreadcrumb as jest.Mock).mockClear();
      (Sentry.setContext as jest.Mock).mockClear();
      (Sentry.setUser as jest.Mock).mockClear();
      (Sentry.setTag as jest.Mock).mockClear();
      (Sentry.close as jest.Mock).mockClear();
      (Sentry.flush as jest.Mock).mockClear();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SentryService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: LoggerService, useValue: mockLoggerService },
        ],
      }).compile();

      service = module.get<SentryService>(SentryService);
      service.onModuleInit();
    });

    it('should capture exception with context', () => {
      const error = new Error('Test error');
      const context = {
        tags: { module: 'video-service', operation: 'generate' },
        extra: { productId: '123', platform: 'youtube' },
        user: { id: 'user-456', email: 'test@example.com' },
      };

      service.captureException(error, context);

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should capture exception without context', () => {
      const error = new Error('Simple error');

      service.captureException(error);

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should capture exception with tags only', () => {
      const error = new Error('Tagged error');
      const context = {
        tags: { severity: 'high', component: 'auth' },
      };

      service.captureException(error, context);

      expect(Sentry.withScope).toHaveBeenCalled();
    });

    it('should capture exception with extra data only', () => {
      const error = new Error('Error with extras');
      const context = {
        extra: { requestId: 'req-789', timestamp: Date.now() },
      };

      service.captureException(error, context);

      expect(Sentry.withScope).toHaveBeenCalled();
    });

    it('should capture exception with user context only', () => {
      const error = new Error('User error');
      const context = {
        user: { id: 'user-123', username: 'testuser' },
      };

      service.captureException(error, context);

      expect(Sentry.withScope).toHaveBeenCalled();
    });
  });

  describe('Message Capturing - Enabled', () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          SENTRY_DSN: 'https://test@sentry.io/123456',
          SENTRY_ENVIRONMENT: 'production',
        };
        return config[key];
      }),
    };

    beforeEach(async () => {
      (Sentry.captureMessage as jest.Mock).mockClear();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SentryService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: LoggerService, useValue: mockLoggerService },
        ],
      }).compile();

      service = module.get<SentryService>(SentryService);
      service.onModuleInit();
    });

    it('should capture message with default info level', () => {
      service.captureMessage('Test message');

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledWith('Test message', 'info');
    });

    it('should capture message with custom severity level', () => {
      service.captureMessage('Warning message', 'warning');

      expect(Sentry.captureMessage).toHaveBeenCalledWith('Warning message', 'warning');
    });

    it('should capture message with error level', () => {
      service.captureMessage('Error message', 'error');

      expect(Sentry.captureMessage).toHaveBeenCalledWith('Error message', 'error');
    });

    it('should capture message with context', () => {
      const context = {
        tags: { environment: 'production' },
        extra: { details: 'Additional info' },
      };

      service.captureMessage('Message with context', 'info', context);

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledWith('Message with context', 'info');
    });
  });

  describe('Transaction and Performance - Enabled', () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          SENTRY_DSN: 'https://test@sentry.io/123456',
        };
        return config[key];
      }),
    };

    beforeEach(async () => {
      (Sentry.startSpan as jest.Mock).mockClear();
      (Sentry.startSpan as jest.Mock).mockImplementation((config, callback) => callback());

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SentryService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: LoggerService, useValue: mockLoggerService },
        ],
      }).compile();

      service = module.get<SentryService>(SentryService);
      service.onModuleInit();
    });

    it('should start transaction with name and operation', () => {
      const transaction = service.startTransaction('video-generation', 'workflow');

      expect(transaction).toHaveProperty('finish');
      expect(transaction).toHaveProperty('setStatus');
      expect(Sentry.startSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'video-generation',
          op: 'workflow',
        }),
        expect.any(Function),
      );
    });

    it('should start transaction with default operation', () => {
      service.startTransaction('content-creation');

      expect(Sentry.startSpan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'content-creation',
          op: 'task',
        }),
        expect.any(Function),
      );
    });

    it('should return transaction object with methods', () => {
      const transaction = service.startTransaction('test-transaction');

      expect(typeof transaction.finish).toBe('function');
      expect(typeof transaction.setStatus).toBe('function');
    });
  });

  describe('Breadcrumbs and Context - Enabled', () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          SENTRY_DSN: 'https://test@sentry.io/123456',
        };
        return config[key];
      }),
    };

    beforeEach(async () => {
      (Sentry.addBreadcrumb as jest.Mock).mockClear();
      (Sentry.setContext as jest.Mock).mockClear();
      (Sentry.setUser as jest.Mock).mockClear();
      (Sentry.setTag as jest.Mock).mockClear();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SentryService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: LoggerService, useValue: mockLoggerService },
        ],
      }).compile();

      service = module.get<SentryService>(SentryService);
      service.onModuleInit();
    });

    it('should add breadcrumb with default level', () => {
      service.addBreadcrumb({ message: 'User clicked button' });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User clicked button',
          level: 'info',
          timestamp: expect.any(Number),
        }),
      );
    });

    it('should add breadcrumb with custom level and category', () => {
      service.addBreadcrumb({
        message: 'API call failed',
        level: 'error',
        category: 'network',
        data: { url: '/api/videos', status: 500 },
      });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'API call failed',
          level: 'error',
          category: 'network',
          data: { url: '/api/videos', status: 500 },
        }),
      );
    });

    it('should set context', () => {
      service.setContext('video', { id: 'video-123', duration: 30 });

      expect(Sentry.setContext).toHaveBeenCalledWith('video', {
        id: 'video-123',
        duration: 30,
      });
    });

    it('should set user', () => {
      service.setUser({ id: 'user-789', email: 'user@example.com' });

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'user-789',
        email: 'user@example.com',
      });
    });

    it('should set tag', () => {
      service.setTag('environment', 'production');

      expect(Sentry.setTag).toHaveBeenCalledWith('environment', 'production');
    });
  });

  describe('Cleanup Operations - Enabled', () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          SENTRY_DSN: 'https://test@sentry.io/123456',
        };
        return config[key];
      }),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SentryService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: LoggerService, useValue: mockLoggerService },
        ],
      }).compile();

      service = module.get<SentryService>(SentryService);
      service.onModuleInit();
    });

    it('should close Sentry with default timeout', async () => {
      const result = await service.close();

      expect(result).toBe(true);
      expect(Sentry.close).toHaveBeenCalledWith(2000);
    });

    it('should close Sentry with custom timeout', async () => {
      const result = await service.close(5000);

      expect(result).toBe(true);
      expect(Sentry.close).toHaveBeenCalledWith(5000);
    });

    it('should flush Sentry with default timeout', async () => {
      const result = await service.flush();

      expect(result).toBe(true);
      expect(Sentry.flush).toHaveBeenCalledWith(2000);
    });

    it('should flush Sentry with custom timeout', async () => {
      const result = await service.flush(3000);

      expect(result).toBe(true);
      expect(Sentry.flush).toHaveBeenCalledWith(3000);
    });
  });

  describe('Cleanup Operations - Disabled', () => {
    const mockConfigServiceNoSentry = {
      get: jest.fn(() => ''),
    };

    beforeEach(async () => {
      (Sentry.close as jest.Mock).mockClear().mockResolvedValue(true);
      (Sentry.flush as jest.Mock).mockClear().mockResolvedValue(true);
      (Sentry.addBreadcrumb as jest.Mock).mockClear();
      (Sentry.setContext as jest.Mock).mockClear();
      (Sentry.setUser as jest.Mock).mockClear();
      (Sentry.setTag as jest.Mock).mockClear();
      (Sentry.startSpan as jest.Mock).mockClear();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SentryService,
          { provide: ConfigService, useValue: mockConfigServiceNoSentry },
          { provide: LoggerService, useValue: mockLoggerService },
        ],
      }).compile();

      service = module.get<SentryService>(SentryService);
      service.onModuleInit();
    });

    it('should return true when closing while disabled', async () => {
      const result = await service.close();

      expect(result).toBe(true);
      expect(Sentry.close).not.toHaveBeenCalled();
    });

    it('should return true when flushing while disabled', async () => {
      const result = await service.flush();

      expect(result).toBe(true);
      expect(Sentry.flush).not.toHaveBeenCalled();
    });

    it('should not add breadcrumb while disabled', () => {
      service.addBreadcrumb({ message: 'test' });

      expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
    });

    it('should not set context while disabled', () => {
      service.setContext('test', { data: 'value' });

      expect(Sentry.setContext).not.toHaveBeenCalled();
    });

    it('should not set user while disabled', () => {
      service.setUser({ id: 'test' });

      expect(Sentry.setUser).not.toHaveBeenCalled();
    });

    it('should not set tag while disabled', () => {
      service.setTag('key', 'value');

      expect(Sentry.setTag).not.toHaveBeenCalled();
    });

    it('should return no-op transaction while disabled', () => {
      const transaction = service.startTransaction('test');

      expect(transaction.finish).toBeDefined();
      expect(transaction.setStatus).toBeDefined();
      expect(Sentry.startSpan).not.toHaveBeenCalled();
    });
  });
});
