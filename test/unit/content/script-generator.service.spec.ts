/**
 * Unit tests for ScriptGeneratorService
 * Coverage: Script generation, template mode, OpenAI integration, FTC compliance, hooks/CTA extraction
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ScriptGeneratorService } from '@/modules/content/services/script-generator.service';
import { OpenAIService } from '@/modules/content/services/openai.service';
import { FtcDisclosureValidatorService } from '@/common/compliance/ftc-disclosure-validator.service';

describe('ScriptGeneratorService', () => {
  let service: ScriptGeneratorService;
  let openaiService: jest.Mocked<OpenAIService>;
  let ftcValidator: jest.Mocked<FtcDisclosureValidatorService>;

  const mockParams = {
    productTitle: 'Wireless Bluetooth Headphones',
    productDescription: 'Premium noise-canceling wireless headphones with 30-hour battery life',
    price: 89.99,
    category: 'Electronics',
    affiliateUrl: 'https://amazon.com/dp/ABC123',
  };

  const mockOpenAIResponse = {
    text: `Wait, did you just see that?

Tired of tangled wires and dead batteries? Same here.

Introducing the Wireless Bluetooth Headphones! These noise-canceling beauties are a total game-changer.

Here's why you need them:
✓ 30-hour battery life - charge once a week
✓ Premium sound quality that rivals $300 headphones
✓ Active noise cancellation for focus anywhere

Link is in my bio - trust me on this one!

As an Amazon Associate, I earn from qualifying purchases.`,
    cost: {
      promptTokens: 150,
      completionTokens: 120,
      totalTokens: 270,
      estimatedCost: 0.0027,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScriptGeneratorService,
        {
          provide: OpenAIService,
          useValue: {
            generateText: jest.fn(),
            isConfigured: jest.fn(),
          },
        },
        {
          provide: FtcDisclosureValidatorService,
          useValue: {
            validateVideoScript: jest.fn(),
            ensureDisclosure: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ScriptGeneratorService>(ScriptGeneratorService);
    openaiService = module.get(OpenAIService);
    ftcValidator = module.get(FtcDisclosureValidatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have required dependencies', () => {
      expect(openaiService).toBeDefined();
      expect(ftcValidator).toBeDefined();
    });
  });

  describe('generate - with OpenAI', () => {
    beforeEach(() => {
      openaiService.isConfigured.mockReturnValue(true);
      openaiService.generateText.mockResolvedValue(mockOpenAIResponse);
      ftcValidator.validateVideoScript.mockReturnValue({
        isValid: true,
        hasDisclosure: true,
        issues: [],
      });
    });

    it('should generate script using OpenAI when configured', async () => {
      const result = await service.generate(mockParams);

      expect(openaiService.isConfigured).toHaveBeenCalled();
      expect(openaiService.generateText).toHaveBeenCalled();
      expect(result.script).toBe(mockOpenAIResponse.text);
    });

    it('should use default language (en) when not specified', async () => {
      await service.generate(mockParams);

      const call = openaiService.generateText.mock.calls[0];
      expect(call[1]?.systemPrompt).toContain('expert video script writer');
    });

    it('should use default tone (engaging) when not specified', async () => {
      await service.generate(mockParams);

      const call = openaiService.generateText.mock.calls[0];
      expect(call[1]?.systemPrompt).toContain('engaging');
    });

    it('should use custom language when specified', async () => {
      await service.generate({ ...mockParams, language: 'es' });

      const call = openaiService.generateText.mock.calls[0];
      expect(call[1]?.systemPrompt).toContain('experto en escribir guiones');
    });

    it('should use custom tone when specified', async () => {
      await service.generate({ ...mockParams, tone: 'professional' });

      const call = openaiService.generateText.mock.calls[0];
      expect(call[1]?.systemPrompt).toContain('professional');
    });

    it('should use Vietnamese language instructions', async () => {
      await service.generate({ ...mockParams, language: 'vi' });

      const call = openaiService.generateText.mock.calls[0];
      expect(call[1]?.systemPrompt).toContain('chuyên gia viết kịch bản');
    });

    it('should include product details in prompt', async () => {
      await service.generate(mockParams);

      const userPrompt = openaiService.generateText.mock.calls[0][0];
      expect(userPrompt).toContain(mockParams.productTitle);
      expect(userPrompt).toContain(mockParams.productDescription);
      expect(userPrompt).toContain(mockParams.category);
      expect(userPrompt).toContain(mockParams.price.toString());
    });

    it('should set temperature to 0.8 for creative output', async () => {
      await service.generate(mockParams);

      const options = openaiService.generateText.mock.calls[0][1];
      expect(options?.temperature).toBe(0.8);
    });

    it('should limit max tokens to 500', async () => {
      await service.generate(mockParams);

      const options = openaiService.generateText.mock.calls[0][1];
      expect(options?.maxTokens).toBe(500);
    });

    it('should log cost information', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.generate(mockParams);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Script generation cost'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0.0027'));

      consoleSpy.mockRestore();
    });
  });

  describe('generate - template mode', () => {
    beforeEach(() => {
      openaiService.isConfigured.mockReturnValue(false);
      ftcValidator.validateVideoScript.mockReturnValue({
        isValid: true,
        hasDisclosure: true,
        issues: [],
      });
    });

    it('should use template when OpenAI not configured', async () => {
      const result = await service.generate(mockParams);

      expect(openaiService.generateText).not.toHaveBeenCalled();
      expect(result.script).toContain('[HOOK]');
      expect(result.script).toContain('[PROBLEM]');
      expect(result.script).toContain('[SOLUTION]');
    });

    it('should include product title in template', async () => {
      const result = await service.generate(mockParams);

      expect(result.script).toContain(mockParams.productTitle);
    });

    it('should include price in template', async () => {
      const result = await service.generate(mockParams);

      expect(result.script).toContain(mockParams.price.toString());
    });

    it('should include FTC disclosure in template', async () => {
      const result = await service.generate(mockParams);

      expect(result.script).toContain('Amazon Associate');
      expect(result.script).toContain('earn from qualifying purchases');
    });
  });

  describe('FTC compliance validation', () => {
    beforeEach(() => {
      openaiService.isConfigured.mockReturnValue(true);
      openaiService.generateText.mockResolvedValue(mockOpenAIResponse);
    });

    it('should validate script for FTC compliance', async () => {
      ftcValidator.validateVideoScript.mockReturnValue({
        isValid: true,
        hasDisclosure: true,
        issues: [],
      });

      await service.generate(mockParams);

      expect(ftcValidator.validateVideoScript).toHaveBeenCalledWith(mockOpenAIResponse.text);
    });

    it('should add disclosure when validation fails', async () => {
      ftcValidator.validateVideoScript.mockReturnValue({
        isValid: false,
        hasDisclosure: false,
        issues: ['Missing FTC disclosure'],
      });
      ftcValidator.ensureDisclosure.mockReturnValue(
        mockOpenAIResponse.text + '\n\nAs an Amazon Associate, I earn from qualifying purchases.',
      );

      const result = await service.generate(mockParams);

      expect(ftcValidator.ensureDisclosure).toHaveBeenCalledWith(
        mockOpenAIResponse.text,
        'youtube',
      );
      expect(result.script).toContain('Amazon Associate');
    });

    it('should log warning when disclosure added', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      ftcValidator.validateVideoScript.mockReturnValue({
        isValid: false,
        hasDisclosure: false,
        issues: ['Missing FTC disclosure'],
      });
      ftcValidator.ensureDisclosure.mockReturnValue(mockOpenAIResponse.text);

      await service.generate(mockParams);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing proper FTC disclosure'),
      );

      consoleSpy.mockRestore();
    });

    it('should log success when validation passes', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      ftcValidator.validateVideoScript.mockReturnValue({
        isValid: true,
        hasDisclosure: true,
        issues: [],
      });

      await service.generate(mockParams);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('passes FTC compliance'));

      consoleSpy.mockRestore();
    });
  });

  describe('hook extraction', () => {
    beforeEach(() => {
      openaiService.isConfigured.mockReturnValue(true);
      ftcValidator.validateVideoScript.mockReturnValue({
        isValid: true,
        hasDisclosure: true,
        issues: [],
      });
    });

    it('should extract hooks from script', async () => {
      openaiService.generateText.mockResolvedValue(mockOpenAIResponse);

      const result = await service.generate(mockParams);

      expect(result.hooks).toBeDefined();
      expect(result.hooks.length).toBeGreaterThan(0);
      expect(result.hooks[0]).toBeTruthy();
    });

    it('should extract first 3 sentences as hooks', async () => {
      openaiService.generateText.mockResolvedValue({
        text: 'Sentence one. Sentence two! Sentence three? Extra sentence.',
        cost: { promptTokens: 10, completionTokens: 10, totalTokens: 20, estimatedCost: 0.0001 },
      });

      const result = await service.generate(mockParams);

      expect(result.hooks.length).toBe(3);
    });

    it('should handle scripts with fewer than 3 sentences', async () => {
      openaiService.generateText.mockResolvedValue({
        text: 'Only one sentence here.',
        cost: { promptTokens: 10, completionTokens: 10, totalTokens: 20, estimatedCost: 0.0001 },
      });

      const result = await service.generate(mockParams);

      expect(result.hooks.length).toBe(1);
    });
  });

  describe('CTA extraction', () => {
    beforeEach(() => {
      openaiService.isConfigured.mockReturnValue(true);
      ftcValidator.validateVideoScript.mockReturnValue({
        isValid: true,
        hasDisclosure: true,
        issues: [],
      });
    });

    it('should extract "link in bio" CTA', async () => {
      openaiService.generateText.mockResolvedValue({
        text: 'Great product! Link in my bio for details.',
        cost: { promptTokens: 10, completionTokens: 10, totalTokens: 20, estimatedCost: 0.0001 },
      });

      const result = await service.generate(mockParams);

      expect(result.cta).toContain('Link in');
      expect(result.cta).toContain('bio');
    });

    it('should extract "check description" CTA', async () => {
      openaiService.generateText.mockResolvedValue({
        text: 'Amazing! Check the description for more info.',
        cost: { promptTokens: 10, completionTokens: 10, totalTokens: 20, estimatedCost: 0.0001 },
      });

      const result = await service.generate(mockParams);

      expect(result.cta).toContain('Check');
      expect(result.cta).toContain('description');
    });

    it('should extract "get yours today" CTA', async () => {
      openaiService.generateText.mockResolvedValue({
        text: 'Limited time offer! Get yours today while supplies last.',
        cost: { promptTokens: 10, completionTokens: 10, totalTokens: 20, estimatedCost: 0.0001 },
      });

      const result = await service.generate(mockParams);

      expect(result.cta).toContain('Get yours');
    });

    it('should extract "don\'t miss out" CTA', async () => {
      openaiService.generateText.mockResolvedValue({
        text: "This is incredible! Don't miss out on this deal.",
        cost: { promptTokens: 10, completionTokens: 10, totalTokens: 20, estimatedCost: 0.0001 },
      });

      const result = await service.generate(mockParams);

      expect(result.cta).toContain('miss out');
    });

    it('should use default CTA when no pattern matches', async () => {
      openaiService.generateText.mockResolvedValue({
        text: 'Just some text without a clear call to action.',
        cost: { promptTokens: 10, completionTokens: 10, totalTokens: 20, estimatedCost: 0.0001 },
      });

      const result = await service.generate(mockParams);

      expect(result.cta).toBe('Link in bio!');
    });

    it('should be case insensitive for CTA matching', async () => {
      openaiService.generateText.mockResolvedValue({
        text: 'LINK IN BIO for more information!',
        cost: { promptTokens: 10, completionTokens: 10, totalTokens: 20, estimatedCost: 0.0001 },
      });

      const result = await service.generate(mockParams);

      expect(result.cta).toBeTruthy();
      expect(result.cta.toLowerCase()).toContain('link');
    });
  });

  describe('duration estimation', () => {
    beforeEach(() => {
      openaiService.isConfigured.mockReturnValue(true);
      ftcValidator.validateVideoScript.mockReturnValue({
        isValid: true,
        hasDisclosure: true,
        issues: [],
      });
    });

    it('should estimate duration based on word count', async () => {
      // ~150 words/minute = 2.5 words/second
      // 125 words = 50 seconds
      const words = Array(125).fill('word').join(' ');
      openaiService.generateText.mockResolvedValue({
        text: words,
        cost: { promptTokens: 10, completionTokens: 10, totalTokens: 20, estimatedCost: 0.0001 },
      });

      const result = await service.generate(mockParams);

      expect(result.estimatedDuration).toBe(50);
    });

    it('should cap duration at 60 seconds for shorts/reels', async () => {
      // 200 words would be ~80 seconds, but should cap at 60
      const words = Array(200).fill('word').join(' ');
      openaiService.generateText.mockResolvedValue({
        text: words,
        cost: { promptTokens: 10, completionTokens: 10, totalTokens: 20, estimatedCost: 0.0001 },
      });

      const result = await service.generate(mockParams);

      expect(result.estimatedDuration).toBe(60);
    });

    it('should handle very short scripts', async () => {
      openaiService.generateText.mockResolvedValue({
        text: 'Quick script.',
        cost: { promptTokens: 10, completionTokens: 10, totalTokens: 20, estimatedCost: 0.0001 },
      });

      const result = await service.generate(mockParams);

      expect(result.estimatedDuration).toBeGreaterThan(0);
      expect(result.estimatedDuration).toBeLessThan(10);
    });

    it('should round up to nearest second', async () => {
      // 3 words = 1.2 seconds, should round to 2
      openaiService.generateText.mockResolvedValue({
        text: 'three word script',
        cost: { promptTokens: 10, completionTokens: 10, totalTokens: 20, estimatedCost: 0.0001 },
      });

      const result = await service.generate(mockParams);

      expect(result.estimatedDuration).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      openaiService.isConfigured.mockReturnValue(true);
      openaiService.generateText.mockRejectedValue(new Error('API Error'));

      await expect(service.generate(mockParams)).rejects.toThrow('API Error');
    });

    it('should handle missing product title', async () => {
      openaiService.isConfigured.mockReturnValue(false);
      ftcValidator.validateVideoScript.mockReturnValue({
        isValid: true,
        hasDisclosure: true,
        issues: [],
      });

      const result = await service.generate({
        ...mockParams,
        productTitle: '',
      });

      expect(result.script).toBeDefined();
    });
  });

  describe('logging', () => {
    beforeEach(() => {
      openaiService.isConfigured.mockReturnValue(true);
      openaiService.generateText.mockResolvedValue(mockOpenAIResponse);
      ftcValidator.validateVideoScript.mockReturnValue({
        isValid: true,
        hasDisclosure: true,
        issues: [],
      });
    });

    it('should log script generation start', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.generate(mockParams);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Generating'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(mockParams.productTitle));

      consoleSpy.mockRestore();
    });

    it('should log language being used', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.generate({ ...mockParams, language: 'es' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('es'));

      consoleSpy.mockRestore();
    });
  });

  describe('system prompt structure', () => {
    beforeEach(() => {
      openaiService.isConfigured.mockReturnValue(true);
      openaiService.generateText.mockResolvedValue(mockOpenAIResponse);
      ftcValidator.validateVideoScript.mockReturnValue({
        isValid: true,
        hasDisclosure: true,
        issues: [],
      });
    });

    it('should include 45-60 second requirement', async () => {
      await service.generate(mockParams);

      const systemPrompt = openaiService.generateText.mock.calls[0][1]?.systemPrompt;
      expect(systemPrompt).toContain('45-60 seconds');
    });

    it('should include word count guidance', async () => {
      await service.generate(mockParams);

      const systemPrompt = openaiService.generateText.mock.calls[0][1]?.systemPrompt;
      expect(systemPrompt).toContain('120-150 words');
    });

    it('should require hook in first 3 seconds', async () => {
      await service.generate(mockParams);

      const systemPrompt = openaiService.generateText.mock.calls[0][1]?.systemPrompt;
      expect(systemPrompt).toContain('first 3 seconds');
    });

    it('should include script structure', async () => {
      await service.generate(mockParams);

      const systemPrompt = openaiService.generateText.mock.calls[0][1]?.systemPrompt;
      expect(systemPrompt).toContain('Hook');
      expect(systemPrompt).toContain('Problem');
      expect(systemPrompt).toContain('Solution');
      expect(systemPrompt).toContain('Benefits');
      expect(systemPrompt).toContain('Call-to-Action');
      expect(systemPrompt).toContain('Disclosure');
    });

    it('should mention FTC compliance', async () => {
      await service.generate(mockParams);

      const systemPrompt = openaiService.generateText.mock.calls[0][1]?.systemPrompt;
      expect(systemPrompt).toContain('FTC');
    });

    it('should optimize for vertical video', async () => {
      await service.generate(mockParams);

      const systemPrompt = openaiService.generateText.mock.calls[0][1]?.systemPrompt;
      expect(systemPrompt).toContain('vertical video');
    });
  });
});
