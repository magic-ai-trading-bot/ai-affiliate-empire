import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

interface GenerateTextOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  model?: string;
}

interface GenerationCost {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

@Injectable()
export class ClaudeService {
  private readonly client: Anthropic | null;
  private readonly model: string;
  private readonly mockMode: boolean;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get('ANTHROPIC_API_KEY');
    this.model = this.config.get('ANTHROPIC_MODEL') || 'claude-3-5-sonnet-20241022';
    this.mockMode = this.config.get('ANTHROPIC_MOCK_MODE') === 'true';

    if (apiKey && !this.mockMode) {
      this.client = new Anthropic({ apiKey });
    } else {
      this.client = null;
      console.warn('⚠️  Claude running in MOCK MODE');
    }
  }

  async generateText(
    prompt: string,
    options?: GenerateTextOptions,
  ): Promise<{ text: string; cost: GenerationCost }> {
    if (!this.client || this.mockMode) {
      return this.getMockResponse(prompt);
    }

    try {
      const message = await this.retryWithBackoff(() =>
        this.client!.messages.create({
          model: options?.model || this.model,
          max_tokens: options?.maxTokens ?? 1024,
          temperature: options?.temperature ?? 0.7,
          system: options?.systemPrompt || '',
          messages: [{ role: 'user', content: prompt }],
        }),
      );

      const text = message.content[0].type === 'text' ? message.content[0].text : '';

      const cost = this.calculateCost(
        message.usage.input_tokens,
        message.usage.output_tokens,
        options?.model || this.model,
      );

      console.log(
        `✅ Claude generation: ${cost.totalTokens} tokens, $${cost.estimatedCost.toFixed(4)}`,
      );

      return {
        text,
        cost: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          totalTokens: message.usage.input_tokens + message.usage.output_tokens,
          estimatedCost: cost.estimatedCost,
        },
      };
    } catch (error) {
      console.error('❌ Claude API error:', error);
      throw new ClaudeError('Failed to generate text', { cause: error });
    }
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Don't retry on certain errors
        if (error.status === 401 || error.status === 403) {
          throw error;
        }

        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`⚠️  Claude retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  private calculateCost(
    inputTokens: number,
    outputTokens: number,
    model: string,
  ): GenerationCost {
    // Claude pricing (as of 2025)
    const rates: Record<string, { input: number; output: number }> = {
      'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 }, // per 1K tokens
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
    };

    const rate = rates[model] || rates['claude-3-5-sonnet-20241022'];
    const inputCost = (inputTokens / 1000) * rate.input;
    const outputCost = (outputTokens / 1000) * rate.output;

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCost: inputCost + outputCost,
    };
  }

  private getMockResponse(prompt: string): { text: string; cost: GenerationCost } {
    return {
      text: `MOCK RESPONSE: Generated content for prompt: "${prompt.substring(0, 50)}..."`,
      cost: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
      },
    };
  }

  isConfigured(): boolean {
    return !!this.client && !this.mockMode;
  }
}

// Custom error class
export class ClaudeError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'ClaudeError';
  }
}
