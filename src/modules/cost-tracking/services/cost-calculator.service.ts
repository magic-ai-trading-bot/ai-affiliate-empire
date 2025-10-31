import { Injectable } from '@nestjs/common';
import { PRICING, CONTENT_COST_ESTIMATES } from '../constants/pricing.constants';
import { CostCalculation } from '../interfaces/service-pricing.interface';

@Injectable()
export class CostCalculatorService {
  /**
   * Calculate OpenAI API cost based on tokens and model
   */
  calculateOpenAICost(
    inputTokens: number,
    outputTokens: number,
    model: string = 'gpt-4-turbo',
  ): CostCalculation {
    const pricing = (PRICING.OPENAI as any)[model] || PRICING.OPENAI['gpt-4-turbo'];
    const inputCost = inputTokens * pricing.input;
    const outputCost = outputTokens * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      service: 'OPENAI',
      operation: `${model}-completion`,
      amount: totalCost,
      details: {
        inputTokens,
        outputTokens,
        tokens: inputTokens + outputTokens,
        model,
        provider: 'openai',
      },
    };
  }

  /**
   * Calculate Claude API cost based on tokens and model
   */
  calculateClaudeCost(
    inputTokens: number,
    outputTokens: number,
    model: string = 'claude-3.5-sonnet',
  ): CostCalculation {
    const pricing = (PRICING.CLAUDE as any)[model] || PRICING.CLAUDE['claude-3.5-sonnet'];
    const inputCost = inputTokens * pricing.input;
    const outputCost = outputTokens * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      service: 'CLAUDE',
      operation: `${model}-completion`,
      amount: totalCost,
      details: {
        inputTokens,
        outputTokens,
        tokens: inputTokens + outputTokens,
        model,
        provider: 'anthropic',
      },
    };
  }

  /**
   * Calculate ElevenLabs TTS cost based on characters
   */
  calculateElevenLabsCost(characters: number): CostCalculation {
    const cost = characters * PRICING.ELEVENLABS.characterCost;

    return {
      service: 'ELEVENLABS',
      operation: 'text-to-speech',
      amount: cost,
      details: {
        duration: Math.ceil(characters / 5), // Rough estimate: 5 chars/second
        provider: 'elevenlabs',
      },
    };
  }

  /**
   * Calculate Pika Labs video generation cost
   */
  calculatePikaCost(durationSeconds: number): CostCalculation {
    const cost = durationSeconds * PRICING.PIKA.secondCost;

    return {
      service: 'PIKA',
      operation: 'video-generation',
      amount: cost,
      details: {
        duration: durationSeconds,
        provider: 'pika',
      },
    };
  }

  /**
   * Calculate DALL-E image generation cost
   */
  calculateDalleCost(resolution: string = '1024x1024'): CostCalculation {
    const cost = (PRICING.DALLE as any)[resolution] || PRICING.DALLE['1024x1024'];

    return {
      service: 'DALLE',
      operation: 'image-generation',
      amount: cost,
      details: {
        provider: 'openai',
        model: 'dall-e-3',
      },
    };
  }

  /**
   * Calculate storage cost (S3/R2)
   */
  calculateStorageCost(bytes: bigint, service: 's3' | 'r2' = 's3'): CostCalculation {
    const pricing = PRICING.STORAGE[service];
    const cost = Number(bytes) * pricing;

    return {
      service: 'S3',
      operation: `${service}-storage`,
      amount: cost,
      details: {
        storageBytes: bytes,
        provider: service,
      },
    };
  }

  /**
   * Calculate compute cost (Fly.io, Temporal)
   */
  calculateComputeCost(minutes: number, service: 'flyio' | 'temporal' = 'flyio'): CostCalculation {
    const pricing = PRICING.COMPUTE[service];
    const cost = minutes * pricing;

    return {
      service: 'COMPUTE',
      operation: `${service}-compute`,
      amount: cost,
      details: {
        computeMinutes: minutes,
        provider: service,
      },
    };
  }

  /**
   * Estimate total cost for video content piece
   */
  estimateVideoContentCost(): number {
    return CONTENT_COST_ESTIMATES.VIDEO_SHORT.total;
  }

  /**
   * Estimate total cost for blog post
   */
  estimateBlogContentCost(): number {
    return CONTENT_COST_ESTIMATES.BLOG_POST.total;
  }

  /**
   * Get detailed cost breakdown for video
   */
  getVideoContentBreakdown() {
    return CONTENT_COST_ESTIMATES.VIDEO_SHORT;
  }

  /**
   * Get detailed cost breakdown for blog
   */
  getBlogContentBreakdown() {
    return CONTENT_COST_ESTIMATES.BLOG_POST;
  }
}
