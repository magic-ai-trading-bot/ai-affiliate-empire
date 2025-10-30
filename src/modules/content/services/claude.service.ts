import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ClaudeService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = 'https://api.anthropic.com/v1';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get('ANTHROPIC_API_KEY') || '';
    this.model = this.config.get('ANTHROPIC_MODEL') || 'claude-3-5-sonnet-20241022';
  }

  async generateText(prompt: string, options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }): Promise<string> {
    if (!this.apiKey) {
      console.warn('⚠️ Anthropic API key not configured');
      return 'Mock response: Anthropic API key not configured';
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: this.model,
          max_tokens: options?.maxTokens || 1024,
          temperature: options?.temperature || 0.7,
          system: options?.systemPrompt || '',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.content[0].text;
    } catch (error) {
      console.error('Error calling Claude API:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
