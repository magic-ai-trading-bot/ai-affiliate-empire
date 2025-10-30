import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { SecretsManagerService } from '../../../common/secrets/secrets-manager.service';

interface GenerateTextOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  model?: string;
}

interface GenerationCost {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

@Injectable()
export class OpenAIService implements OnModuleInit {
  private client: OpenAI | null = null;
  private readonly model: string;
  private readonly mockMode: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly secretsManager: SecretsManagerService,
  ) {
    this.model = this.config.get('OPENAI_MODEL') || 'gpt-4-turbo-preview';
    this.mockMode = this.config.get('OPENAI_MOCK_MODE') === 'true';
  }

  async onModuleInit() {
    if (this.mockMode) {
      console.warn('⚠️  OpenAI running in MOCK MODE');
      return;
    }

    // Retrieve API key from Secrets Manager with fallback to env var
    const apiKey = await this.secretsManager.getSecret('openai-api-key', 'OPENAI_API_KEY');

    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      console.log('✅ OpenAI service initialized with API key');
    } else {
      console.warn('⚠️  OpenAI API key not found, running in MOCK MODE');
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
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      if (options?.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }

      messages.push({ role: 'user', content: prompt });

      const completion = await this.retryWithBackoff(() =>
        this.client!.chat.completions.create({
          model: options?.model || this.model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 500,
        }),
      );

      const text = completion.choices[0]?.message?.content || '';
      const usage = completion.usage;

      const cost = this.calculateCost(
        usage?.prompt_tokens || 0,
        usage?.completion_tokens || 0,
        options?.model || this.model,
      );

      console.log(
        `✅ OpenAI generation: ${usage?.total_tokens} tokens, $${cost.estimatedCost.toFixed(4)}`,
      );

      return {
        text,
        cost: {
          promptTokens: usage?.prompt_tokens || 0,
          completionTokens: usage?.completion_tokens || 0,
          totalTokens: usage?.total_tokens || 0,
          estimatedCost: cost.estimatedCost,
        },
      };
    } catch (error) {
      console.error('❌ OpenAI API error:', error);
      throw new OpenAIError('Failed to generate text', { cause: error });
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
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.warn(`⚠️  OpenAI retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  private calculateCost(
    promptTokens: number,
    completionTokens: number,
    model: string,
  ): GenerationCost {
    // GPT-4 Turbo pricing (as of 2025)
    const rates: Record<string, { input: number; output: number }> = {
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 }, // per 1K tokens
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    };

    const rate = rates[model] || rates['gpt-4-turbo-preview'];
    const inputCost = (promptTokens / 1000) * rate.input;
    const outputCost = (completionTokens / 1000) * rate.output;

    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      estimatedCost: inputCost + outputCost,
    };
  }

  private getMockResponse(prompt: string): { text: string; cost: GenerationCost } {
    return {
      text: `MOCK RESPONSE: Generated content for prompt: "${prompt.substring(0, 50)}..."`,
      cost: {
        promptTokens: 0,
        completionTokens: 0,
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
export class OpenAIError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}
