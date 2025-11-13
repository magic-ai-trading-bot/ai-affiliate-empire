/**
 * Unit tests for OpenAI Service
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAIService, OpenAIError } from '@/modules/content/services/openai.service';
import { SecretsManagerService } from '@/common/secrets/secrets-manager.service';
import OpenAI from 'openai';

// Mock OpenAI SDK
jest.mock('openai');

describe('OpenAIService', () => {
  let service: OpenAIService;
  let configService: jest.Mocked<ConfigService>;
  let secretsManager: jest.Mocked<SecretsManagerService>;
  let mockOpenAIClient: jest.Mocked<OpenAI>;

  beforeEach(async () => {
    // Create mock create function
    const mockCreate = jest.fn();

    // Create mock instances
    mockOpenAIClient = {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAIService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: SecretsManagerService,
          useValue: {
            getSecret: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OpenAIService>(OpenAIService);
    configService = module.get(ConfigService);
    secretsManager = module.get(SecretsManagerService);

    // Mock OpenAI constructor
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAIClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize in mock mode when OPENAI_MOCK_MODE is true', async () => {
      // Service already initialized with mock mode in constructor
      // We need to create a new instance with mock mode enabled
      configService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_MOCK_MODE') return 'true';
        return null;
      });

      const module = await Test.createTestingModule({
        providers: [
          OpenAIService,
          { provide: ConfigService, useValue: configService },
          { provide: SecretsManagerService, useValue: secretsManager },
        ],
      }).compile();

      const mockService = module.get<OpenAIService>(OpenAIService);
      await mockService.onModuleInit();

      expect(secretsManager.getSecret).not.toHaveBeenCalled();
      expect(OpenAI).not.toHaveBeenCalled();
    });

    it('should initialize with API key from secrets manager', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_MOCK_MODE') return 'false';
        if (key === 'OPENAI_MODEL') return 'gpt-4-turbo-preview';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');

      await service.onModuleInit();

      expect(secretsManager.getSecret).toHaveBeenCalledWith('openai-api-key', 'OPENAI_API_KEY');
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });

    it('should fall back to mock mode when no API key is found', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue(null);

      await service.onModuleInit();

      expect(OpenAI).not.toHaveBeenCalled();
    });
  });

  describe('generateText', () => {
    it('should return mock response in mock mode', async () => {
      configService.get.mockReturnValue('true');
      await service.onModuleInit();

      const result = await service.generateText('Test prompt');

      expect(result.text).toContain('MOCK RESPONSE');
      expect(result.cost.estimatedCost).toBe(0);
      expect(result.cost.totalTokens).toBe(0);
    });

    it('should generate text successfully with OpenAI API', async () => {
      // Setup service with real client
      configService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_MOCK_MODE') return 'false';
        if (key === 'OPENAI_MODEL') return 'gpt-4-turbo-preview';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      // Mock OpenAI response
      (mockOpenAIClient.chat.completions.create as jest.Mock).mockResolvedValue({
        id: 'test-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4-turbo-preview',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Generated test content',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      } as any);

      const result = await service.generateText('Test prompt');

      expect(result.text).toBe('Generated test content');
      expect(result.cost.promptTokens).toBe(100);
      expect(result.cost.completionTokens).toBe(50);
      expect(result.cost.totalTokens).toBe(150);
      expect(result.cost.estimatedCost).toBeGreaterThan(0);
    });

    it('should use custom options when provided', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      (mockOpenAIClient.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: 'test' } }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      } as any);

      await service.generateText('Test', {
        temperature: 0.5,
        maxTokens: 1000,
        systemPrompt: 'You are a helpful assistant',
        model: 'gpt-3.5-turbo',
      });

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Test' },
        ],
        temperature: 0.5,
        max_tokens: 1000,
      });
    });

    it('should calculate cost correctly for different models', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      // Test GPT-3.5 pricing
      (mockOpenAIClient.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: 'test' } }],
        usage: { prompt_tokens: 1000, completion_tokens: 1000, total_tokens: 2000 },
      } as any);

      const result = await service.generateText('Test', { model: 'gpt-3.5-turbo' });

      // GPT-3.5: $0.0005/1K input, $0.0015/1K output
      // (1000/1000 * 0.0005) + (1000/1000 * 0.0015) = 0.002
      expect(result.cost.estimatedCost).toBeCloseTo(0.002, 4);
    });

    it('should throw OpenAIError on API failure', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      (mockOpenAIClient.chat.completions.create as jest.Mock).mockRejectedValue(
        new Error('API Error'),
      );

      await expect(service.generateText('Test')).rejects.toThrow(OpenAIError);
      await expect(service.generateText('Test')).rejects.toThrow('Failed to generate text');
    }, 10000);
  });

  describe('retry logic', () => {
    it('should retry on transient failures', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      // Fail twice, then succeed
      let callCount = 0;
      (mockOpenAIClient.chat.completions.create as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject({ status: 500, message: 'Server error' });
        }
        return Promise.resolve({
          choices: [{ message: { content: 'success' } }],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        } as any);
      });

      const result = await service.generateText('Test');

      expect(result.text).toBe('success');
      expect(callCount).toBe(3);
    });

    it('should not retry on 401 unauthorized errors', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      (mockOpenAIClient.chat.completions.create as jest.Mock).mockRejectedValue({
        status: 401,
        message: 'Unauthorized',
      });

      await expect(service.generateText('Test')).rejects.toThrow();

      // Should only be called once (no retries)
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 403 forbidden errors', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      (mockOpenAIClient.chat.completions.create as jest.Mock).mockRejectedValue({
        status: 403,
        message: 'Forbidden',
      });

      await expect(service.generateText('Test')).rejects.toThrow();

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('should give up after max retries', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      (mockOpenAIClient.chat.completions.create as jest.Mock).mockRejectedValue({
        status: 500,
        message: 'Server error',
      });

      await expect(service.generateText('Test')).rejects.toThrow();

      // Should be called 3 times (initial + 2 retries)
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('isConfigured', () => {
    it('should return false in mock mode', async () => {
      configService.get.mockReturnValue('true');
      await service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });

    it('should return true when properly configured', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when no API key', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue(null);
      await service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty API response', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      (mockOpenAIClient.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: '' } }],
        usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
      } as any);

      const result = await service.generateText('Test');

      expect(result.text).toBe('');
      expect(result.cost.completionTokens).toBe(0);
    });

    it('should handle missing usage data', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      (mockOpenAIClient.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: 'test' } }],
        usage: undefined,
      } as any);

      const result = await service.generateText('Test');

      expect(result.text).toBe('test');
      expect(result.cost.totalTokens).toBe(0);
      expect(result.cost.estimatedCost).toBe(0);
    });

    it('should handle long prompts', async () => {
      configService.get.mockReturnValue('true');
      await service.onModuleInit();

      const longPrompt = 'A'.repeat(10000);
      const result = await service.generateText(longPrompt);

      expect(result.text).toContain('MOCK RESPONSE');
      expect(result.text.length).toBeLessThan(longPrompt.length);
    });
  });
});
