import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface GenerateVoiceParams {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
}

@Injectable()
export class ElevenLabsService {
  private readonly apiKey: string;
  private readonly defaultVoiceId: string;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get('ELEVENLABS_API_KEY') || '';
    this.defaultVoiceId = this.config.get('ELEVENLABS_VOICE_ID') || 'default';
  }

  /**
   * Generate voice audio from text using ElevenLabs API
   */
  async generateVoice(params: GenerateVoiceParams): Promise<string> {
    const {
      text,
      voiceId = this.defaultVoiceId,
      stability = 0.5,
      similarityBoost = 0.75,
    } = params;

    console.log(`🎤 ElevenLabs: Generating voice (${text.split(' ').length} words)...`);

    if (!this.apiKey) {
      console.warn('⚠️ ElevenLabs API key not configured, returning mock URL');
      return this.getMockAudioUrl();
    }

    try {
      // TODO: Implement actual ElevenLabs API call
      // Example structure:
      /*
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        },
      );

      // Save audio to storage and return URL
      const audioUrl = await this.saveAudioToStorage(response.data);
      return audioUrl;
      */

      console.warn('⚠️ ElevenLabs API integration pending, returning mock URL');
      return this.getMockAudioUrl();
    } catch (error) {
      console.error('Error generating voice with ElevenLabs:', error);
      throw error;
    }
  }

  /**
   * Get available voices
   */
  async getVoices() {
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      return response.data.voices;
    } catch (error) {
      console.error('Error fetching voices:', error);
      return [];
    }
  }

  /**
   * Mock audio URL for development/testing
   */
  private getMockAudioUrl(): string {
    return 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
