/**
 * Unit tests for Claude Service
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClaudeService, ClaudeError } from '@/modules/content/services/claude.service';
import { SecretsManagerService } from '@/common/secrets/secrets-manager.service';
import Anthropic from '@anthropic-ai/sdk';

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk');

describe('ClaudeService', () => {
  let service: ClaudeService;
  let configService: jest.Mocked<ConfigService>;
  let secretsManager: jest.Mocked<SecretsManagerService>;
  let mockAnthropicClient: jest.Mocked<Anthropic>;

  beforeEach(async () => {
    // Create mock instances
    mockAnthropicClient = {
      messages: {
        create: jest.fn(),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaudeService,
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

    service = module.get<ClaudeService>(ClaudeService);
    configService = module.get(ConfigService);
    secretsManager = module.get(SecretsManagerService);

    // Mock Anthropic constructor
    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => mockAnthropicClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize in mock mode when ANTHROPIC_MOCK_MODE is true', async () => {
      // Service already initialized with mock mode in constructor
      // We need to create a new instance with mock mode enabled
      configService.get.mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_MOCK_MODE') return 'true';
        return null;
      });

      const module = await Test.createTestingModule({
        providers: [
          ClaudeService,
          { provide: ConfigService, useValue: configService },
          { provide: SecretsManagerService, useValue: secretsManager },
        ],
      }).compile();

      const mockService = module.get<ClaudeService>(ClaudeService);
      await mockService.onModuleInit();

      expect(secretsManager.getSecret).not.toHaveBeenCalled();
      expect(Anthropic).not.toHaveBeenCalled();
    });

    it('should initialize with API key from secrets manager', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_MOCK_MODE') return 'false';
        if (key === 'ANTHROPIC_MODEL') return 'claude-3-5-sonnet-20241022';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');

      await service.onModuleInit();

      expect(secretsManager.getSecret).toHaveBeenCalledWith('anthropic-api-key', 'ANTHROPIC_API_KEY');
      expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });

    it('should fall back to mock mode when no API key is found', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue(null);

      await service.onModuleInit();

      expect(Anthropic).not.toHaveBeenCalled();
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

    it('should generate text successfully with Claude API', async () => {
      // Setup service with real client
      configService.get.mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_MOCK_MODE') return 'false';
        if (key === 'ANTHROPIC_MODEL') return 'claude-3-5-sonnet-20241022';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      // Mock Claude response
      (mockAnthropicClient.messages.create as jest.Mock).mockResolvedValue({
        id: 'test-id',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Generated test content',
          },
        ],
        model: 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      } as any);

      const result = await service.generateText('Test prompt');

      expect(result.text).toBe('Generated test content');
      expect(result.cost.inputTokens).toBe(100);
      expect(result.cost.outputTokens).toBe(50);
      expect(result.cost.totalTokens).toBe(150);
      expect(result.cost.estimatedCost).toBeGreaterThan(0);
    });

    it('should use custom options when provided', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      (mockAnthropicClient.messages.create as jest.Mock).mockResolvedValue({
        content: [{ type: 'text', text: 'test' }],
        usage: { input_tokens: 10, output_tokens: 10 },
      } as any);

      await service.generateText('Test', {
        temperature: 0.5,
        maxTokens: 2000,
        systemPrompt: 'You are a helpful assistant',
        model: 'claude-3-haiku-20240307',
      });

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        temperature: 0.5,
        system: 'You are a helpful assistant',
        messages: [{ role: 'user', content: 'Test' }],
      });
    });

    it('should calculate cost correctly for different models', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      // Test Haiku pricing
      (mockAnthropicClient.messages.create as jest.Mock).mockResolvedValue({
        content: [{ type: 'text', text: 'test' }],
        usage: { input_tokens: 1000, output_tokens: 1000 },
      } as any);

      const result = await service.generateText('Test', { model: 'claude-3-haiku-20240307' });

      // Haiku: $0.00025/1K input, $0.00125/1K output
      // (1000/1000 * 0.00025) + (1000/1000 * 0.00125) = 0.0015
      expect(result.cost.estimatedCost).toBeCloseTo(0.0015, 4);
    });

    it('should throw ClaudeError on API failure', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      (mockAnthropicClient.messages.create as jest.Mock).mockRejectedValue(new Error('API Error'));

      await expect(service.generateText('Test')).rejects.toThrow(ClaudeError);
      await expect(service.generateText('Test')).rejects.toThrow('Failed to generate text');
    });
  });

  describe('retry logic', () => {
    it('should retry on transient failures', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      // Fail twice, then succeed
      let callCount = 0;
      (mockAnthropicClient.messages.create as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject({ status: 500, message: 'Server error' });
        }
        return Promise.resolve({
          content: [{ type: 'text', text: 'success' }],
          usage: { input_tokens: 10, output_tokens: 10 },
        } as any);
      });

      const result = await service.generateText('Test');

      expect(result.text).toBe('success');
      expect(callCount).toBe(3);
    });

    it('should not retry on 401 unauthorized errors', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      (mockAnthropicClient.messages.create as jest.Mock).mockRejectedValue({
        status: 401,
        message: 'Unauthorized',
      });

      await expect(service.generateText('Test')).rejects.toThrow();

      // Should only be called once (no retries)
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 403 forbidden errors', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      (mockAnthropicClient.messages.create as jest.Mock).mockRejectedValue({
        status: 403,
        message: 'Forbidden',
      });

      await expect(service.generateText('Test')).rejects.toThrow();

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(1);
    });

    it('should give up after max retries', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      (mockAnthropicClient.messages.create as jest.Mock).mockRejectedValue({
        status: 500,
        message: 'Server error',
      });

      await expect(service.generateText('Test')).rejects.toThrow();

      // Should be called 3 times (initial + 2 retries)
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(3);
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
        if (key === 'ANTHROPIC_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when no API key', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_MOCK_MODE') return 'false';
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
        if (key === 'ANTHROPIC_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      (mockAnthropicClient.messages.create as jest.Mock).mockResolvedValue({
        content: [{ type: 'text', text: '' }],
        usage: { input_tokens: 10, output_tokens: 0 },
      } as any);

      const result = await service.generateText('Test');

      expect(result.text).toBe('');
      expect(result.cost.outputTokens).toBe(0);
    });

    it('should handle non-text content types', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_MOCK_MODE') return 'false';
        return null;
      });
      secretsManager.getSecret.mockResolvedValue('test-api-key');
      await service.onModuleInit();

      (mockAnthropicClient.messages.create as jest.Mock).mockResolvedValue({
        content: [{ type: 'image', source: {} }],
        usage: { input_tokens: 10, output_tokens: 10 },
      } as any);

      const result = await service.generateText('Test');

      expect(result.text).toBe('');
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
