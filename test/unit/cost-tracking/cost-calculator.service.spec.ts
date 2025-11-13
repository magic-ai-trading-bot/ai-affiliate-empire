/**
 * Unit tests for CostCalculatorService
 * Coverage: OpenAI, Claude, ElevenLabs, Pika, DALL-E, Storage, Compute cost calculations
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CostCalculatorService } from '@/modules/cost-tracking/services/cost-calculator.service';
import {
  PRICING,
  CONTENT_COST_ESTIMATES,
} from '@/modules/cost-tracking/constants/pricing.constants';

describe('CostCalculatorService', () => {
  let service: CostCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CostCalculatorService],
    }).compile();

    service = module.get<CostCalculatorService>(CostCalculatorService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('calculateOpenAICost', () => {
    it('should calculate cost for GPT-4 Turbo correctly', () => {
      const result = service.calculateOpenAICost(1000, 500, 'gpt-4-turbo');

      const expectedInputCost = 1000 * PRICING.OPENAI['gpt-4-turbo'].input;
      const expectedOutputCost = 500 * PRICING.OPENAI['gpt-4-turbo'].output;
      const expectedTotal = expectedInputCost + expectedOutputCost;

      expect(result.service).toBe('OPENAI');
      expect(result.operation).toBe('gpt-4-turbo-completion');
      expect(result.amount).toBeCloseTo(expectedTotal, 6);
      expect(result.details.inputTokens).toBe(1000);
      expect(result.details.outputTokens).toBe(500);
      expect(result.details.tokens).toBe(1500);
    });

    it('should calculate cost for GPT-3.5 Turbo', () => {
      const result = service.calculateOpenAICost(1000, 500, 'gpt-3.5-turbo');

      const expectedInputCost = 1000 * PRICING.OPENAI['gpt-3.5-turbo'].input;
      const expectedOutputCost = 500 * PRICING.OPENAI['gpt-3.5-turbo'].output;
      const expectedTotal = expectedInputCost + expectedOutputCost;

      expect(result.amount).toBeCloseTo(expectedTotal, 6);
      expect(result.operation).toBe('gpt-3.5-turbo-completion');
    });

    it('should calculate cost for GPT-4o', () => {
      const result = service.calculateOpenAICost(2000, 1000, 'gpt-4o');

      const expectedInputCost = 2000 * PRICING.OPENAI['gpt-4o'].input;
      const expectedOutputCost = 1000 * PRICING.OPENAI['gpt-4o'].output;
      const expectedTotal = expectedInputCost + expectedOutputCost;

      expect(result.amount).toBeCloseTo(expectedTotal, 6);
    });

    it('should calculate cost for GPT-4o-mini', () => {
      const result = service.calculateOpenAICost(2000, 1000, 'gpt-4o-mini');

      const expectedInputCost = 2000 * PRICING.OPENAI['gpt-4o-mini'].input;
      const expectedOutputCost = 1000 * PRICING.OPENAI['gpt-4o-mini'].output;
      const expectedTotal = expectedInputCost + expectedOutputCost;

      expect(result.amount).toBeCloseTo(expectedTotal, 6);
    });

    it('should default to GPT-4 Turbo when no model specified', () => {
      const result = service.calculateOpenAICost(1000, 500);

      expect(result.operation).toBe('gpt-4-turbo-completion');
      expect(result.details.model).toBe('gpt-4-turbo');
    });

    it('should fallback to GPT-4 Turbo for unknown model', () => {
      const result = service.calculateOpenAICost(1000, 500, 'unknown-model');

      const expectedInputCost = 1000 * PRICING.OPENAI['gpt-4-turbo'].input;
      const expectedOutputCost = 500 * PRICING.OPENAI['gpt-4-turbo'].output;
      const expectedTotal = expectedInputCost + expectedOutputCost;

      expect(result.amount).toBeCloseTo(expectedTotal, 6);
    });

    it('should include model in details', () => {
      const result = service.calculateOpenAICost(1000, 500, 'gpt-4-turbo');

      expect(result.details.model).toBe('gpt-4-turbo');
      expect(result.details.provider).toBe('openai');
    });

    it('should handle zero tokens', () => {
      const result = service.calculateOpenAICost(0, 0);

      expect(result.amount).toBe(0);
      expect(result.details.tokens).toBe(0);
    });
  });

  describe('calculateElevenLabsCost', () => {
    it('should calculate cost based on character count', () => {
      const characters = 1000;
      const result = service.calculateElevenLabsCost(characters);

      const expectedCost = characters * PRICING.ELEVENLABS.characterCost;

      expect(result.service).toBe('ELEVENLABS');
      expect(result.operation).toBe('text-to-speech');
      expect(result.amount).toBeCloseTo(expectedCost, 6);
      expect(result.details.provider).toBe('elevenlabs');
    });

    it('should estimate duration correctly (5 chars/second)', () => {
      const characters = 300;
      const result = service.calculateElevenLabsCost(characters);

      expect(result.details.duration).toBe(Math.ceil(300 / 5)); // 60 seconds
    });

    it('should handle zero characters', () => {
      const result = service.calculateElevenLabsCost(0);

      expect(result.amount).toBe(0);
      expect(result.details.duration).toBe(0);
    });

    it('should round up duration', () => {
      const characters = 303; // 60.6 seconds, should round to 61
      const result = service.calculateElevenLabsCost(characters);

      expect(result.details.duration).toBe(Math.ceil(303 / 5));
    });
  });

  describe('calculatePikaCost', () => {
    it('should calculate cost based on duration', () => {
      const duration = 60;
      const result = service.calculatePikaCost(duration);

      const expectedCost = duration * PRICING.PIKA.secondCost;

      expect(result.service).toBe('PIKA');
      expect(result.operation).toBe('video-generation');
      expect(result.amount).toBeCloseTo(expectedCost, 6);
      expect(result.details.duration).toBe(duration);
      expect(result.details.provider).toBe('pika');
    });

    it('should handle 30-second videos', () => {
      const result = service.calculatePikaCost(30);

      const expectedCost = 30 * PRICING.PIKA.secondCost;
      expect(result.amount).toBeCloseTo(expectedCost, 6);
    });

    it('should handle zero duration', () => {
      const result = service.calculatePikaCost(0);

      expect(result.amount).toBe(0);
    });
  });

  describe('calculateDalleCost', () => {
    it('should calculate cost for 1024x1024 resolution', () => {
      const result = service.calculateDalleCost('1024x1024');

      expect(result.service).toBe('DALLE');
      expect(result.operation).toBe('image-generation');
      expect(result.amount).toBe(PRICING.DALLE['1024x1024']);
      expect(result.details.provider).toBe('openai');
      expect(result.details.model).toBe('dall-e-3');
    });

    it('should calculate cost for 1024x1792 resolution', () => {
      const result = service.calculateDalleCost('1024x1792');

      expect(result.amount).toBe(PRICING.DALLE['1024x1792']);
    });

    it('should calculate cost for 1792x1024 resolution', () => {
      const result = service.calculateDalleCost('1792x1024');

      expect(result.amount).toBe(PRICING.DALLE['1792x1024']);
    });

    it('should default to 1024x1024', () => {
      const result = service.calculateDalleCost();

      expect(result.amount).toBe(PRICING.DALLE['1024x1024']);
    });

    it('should fallback to 1024x1024 for unknown resolution', () => {
      const result = service.calculateDalleCost('unknown-resolution');

      expect(result.amount).toBe(PRICING.DALLE['1024x1024']);
    });
  });

  describe('calculateStorageCost', () => {
    it('should calculate S3 storage cost', () => {
      const bytes = BigInt(1024 * 1024 * 1024); // 1 GB
      const result = service.calculateStorageCost(bytes, 's3');

      const expectedCost = Number(bytes) * PRICING.STORAGE.s3;

      expect(result.service).toBe('S3');
      expect(result.operation).toBe('s3-storage');
      expect(result.amount).toBeCloseTo(expectedCost, 6);
      expect(result.details.storageBytes).toBe(bytes);
      expect(result.details.provider).toBe('s3');
    });

    it('should calculate R2 storage cost', () => {
      const bytes = BigInt(1024 * 1024 * 1024); // 1 GB
      const result = service.calculateStorageCost(bytes, 'r2');

      const expectedCost = Number(bytes) * PRICING.STORAGE.r2;

      expect(result.amount).toBeCloseTo(expectedCost, 6);
      expect(result.operation).toBe('r2-storage');
      expect(result.details.provider).toBe('r2');
    });

    it('should default to S3', () => {
      const bytes = BigInt(1024);
      const result = service.calculateStorageCost(bytes);

      expect(result.operation).toBe('s3-storage');
      expect(result.details.provider).toBe('s3');
    });

    it('should handle zero bytes', () => {
      const result = service.calculateStorageCost(BigInt(0));

      expect(result.amount).toBe(0);
    });

    it('should handle large storage amounts', () => {
      const bytes = BigInt(100) * BigInt(1024 * 1024 * 1024); // 100 GB
      const result = service.calculateStorageCost(bytes, 's3');

      expect(result.amount).toBeGreaterThan(0);
      expect(result.details.storageBytes).toBe(bytes);
    });
  });

  describe('calculateComputeCost', () => {
    it('should calculate Fly.io compute cost', () => {
      const minutes = 60;
      const result = service.calculateComputeCost(minutes, 'flyio');

      const expectedCost = minutes * PRICING.COMPUTE.flyio;

      expect(result.service).toBe('COMPUTE');
      expect(result.operation).toBe('flyio-compute');
      expect(result.amount).toBeCloseTo(expectedCost, 6);
      expect(result.details.computeMinutes).toBe(minutes);
      expect(result.details.provider).toBe('flyio');
    });

    it('should calculate Temporal compute cost', () => {
      const minutes = 120;
      const result = service.calculateComputeCost(minutes, 'temporal');

      const expectedCost = minutes * PRICING.COMPUTE.temporal;

      expect(result.amount).toBeCloseTo(expectedCost, 6);
      expect(result.operation).toBe('temporal-compute');
      expect(result.details.provider).toBe('temporal');
    });

    it('should default to Fly.io', () => {
      const result = service.calculateComputeCost(60);

      expect(result.operation).toBe('flyio-compute');
      expect(result.details.provider).toBe('flyio');
    });

    it('should handle zero minutes', () => {
      const result = service.calculateComputeCost(0);

      expect(result.amount).toBe(0);
    });
  });

  describe('estimateVideoContentCost', () => {
    it('should return estimated total cost for video', () => {
      const cost = service.estimateVideoContentCost();

      expect(cost).toBe(CONTENT_COST_ESTIMATES.VIDEO_SHORT.total);
      expect(cost).toBeGreaterThan(0);
    });

    it('should return consistent cost', () => {
      const cost1 = service.estimateVideoContentCost();
      const cost2 = service.estimateVideoContentCost();

      expect(cost1).toBe(cost2);
    });
  });

  describe('estimateBlogContentCost', () => {
    it('should return estimated total cost for blog', () => {
      const cost = service.estimateBlogContentCost();

      expect(cost).toBe(CONTENT_COST_ESTIMATES.BLOG_POST.total);
      expect(cost).toBeGreaterThan(0);
    });

    it('should return consistent cost', () => {
      const cost1 = service.estimateBlogContentCost();
      const cost2 = service.estimateBlogContentCost();

      expect(cost1).toBe(cost2);
    });

    it('should be cheaper than video content', () => {
      const blogCost = service.estimateBlogContentCost();
      const videoCost = service.estimateVideoContentCost();

      expect(blogCost).toBeLessThan(videoCost);
    });
  });

  describe('getVideoContentBreakdown', () => {
    it('should return detailed video cost breakdown', () => {
      const breakdown = service.getVideoContentBreakdown();

      expect(breakdown).toBeDefined();
      expect(breakdown.script).toBeDefined();
      expect(breakdown.voice).toBeDefined();
      expect(breakdown.video).toBeDefined();
      expect(breakdown.thumbnail).toBeDefined();
      expect(breakdown.total).toBeDefined();
    });

    it('should include all component costs', () => {
      const breakdown = service.getVideoContentBreakdown();

      expect(breakdown.script.estimatedCost).toBeGreaterThan(0);
      expect(breakdown.voice.estimatedCost).toBeGreaterThan(0);
      expect(breakdown.video.estimatedCost).toBeGreaterThan(0);
      expect(breakdown.thumbnail.estimatedCost).toBeGreaterThan(0);
    });

    it('should specify service for each component', () => {
      const breakdown = service.getVideoContentBreakdown();

      expect(breakdown.script.service).toBe('OPENAI');
      expect(breakdown.voice.service).toBe('ELEVENLABS');
      expect(breakdown.video.service).toBe('PIKA');
      expect(breakdown.thumbnail.service).toBe('DALLE');
    });
  });

  describe('getBlogContentBreakdown', () => {
    it('should return detailed blog cost breakdown', () => {
      const breakdown = service.getBlogContentBreakdown();

      expect(breakdown).toBeDefined();
      expect(breakdown.content).toBeDefined();
      expect(breakdown.total).toBeDefined();
    });

    it('should include content cost', () => {
      const breakdown = service.getBlogContentBreakdown();

      expect(breakdown.content.estimatedCost).toBeGreaterThan(0);
    });

    it('should specify Claude as service', () => {
      const breakdown = service.getBlogContentBreakdown();

      expect(breakdown.content.service).toBe('CLAUDE');
      expect(breakdown.content.model).toBe('claude-3.5-sonnet');
    });
  });

  describe('cost calculation accuracy', () => {
    it('should maintain precision for small amounts', () => {
      const result = service.calculateOpenAICost(1, 1, 'gpt-4o-mini');

      expect(result.amount).toBeGreaterThan(0);
      expect(result.amount).toBeLessThan(0.001);
    });

    it('should calculate large amounts correctly', () => {
      const result = service.calculateOpenAICost(100000, 50000, 'gpt-4');

      expect(result.amount).toBeGreaterThan(1);
    });

    it('should be consistent across multiple calls', () => {
      const result1 = service.calculateOpenAICost(1000, 500, 'gpt-4-turbo');
      const result2 = service.calculateOpenAICost(1000, 500, 'gpt-4-turbo');

      expect(result1.amount).toBe(result2.amount);
    });
  });
});
