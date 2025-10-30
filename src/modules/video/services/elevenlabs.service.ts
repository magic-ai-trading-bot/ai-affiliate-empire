import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { SecretsManagerService } from '../../../common/secrets/secrets-manager.service';

interface GenerateVoiceParams {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
}

@Injectable()
export class ElevenLabsService implements OnModuleInit {
  private apiKey: string = '';
  private readonly defaultVoiceId: string;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';
  private readonly mockMode: boolean;
  private readonly storageDir: string;

  constructor(
    private readonly config: ConfigService,
    private readonly secretsManager: SecretsManagerService,
  ) {
    this.defaultVoiceId = this.config.get('ELEVENLABS_VOICE_ID') || 'EXAVITQu4vr4xnSDxMaL';
    this.mockMode = this.config.get('ELEVENLABS_MOCK_MODE') === 'true';
    this.storageDir = this.config.get('STORAGE_DIR') || '/tmp/audio';

    // Create storage directory if it doesn't exist
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async onModuleInit() {
    if (this.mockMode) {
      console.warn('⚠️  ElevenLabs running in MOCK MODE');
      return;
    }

    // Retrieve API key from Secrets Manager with fallback to env var
    const apiKey = await this.secretsManager.getSecret('elevenlabs-api-key', 'ELEVENLABS_API_KEY');

    if (apiKey) {
      this.apiKey = apiKey;
      console.log('✅ ElevenLabs service initialized with API key');
    } else {
      console.warn('⚠️  ElevenLabs API key not found, running in MOCK MODE');
    }
  }

  async generateVoice(params: GenerateVoiceParams): Promise<string> {
    const {
      text,
      voiceId = this.defaultVoiceId,
      stability = 0.5,
      similarityBoost = 0.75,
    } = params;

    console.log(`🎤 Generating voice: ${text.split(' ').length} words`);

    if (!this.apiKey || this.mockMode) {
      return this.getMockAudioUrl();
    }

    try {
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
            Accept: 'audio/mpeg',
          },
          responseType: 'arraybuffer',
        },
      );

      // Save audio to storage
      const filename = `voice-${Date.now()}.mp3`;
      const filepath = path.join(this.storageDir, filename);
      fs.writeFileSync(filepath, Buffer.from(response.data));

      console.log(`✅ Voice generated: ${filepath}`);

      // Return file path or URL (in production, upload to CDN)
      return filepath;
    } catch (error: any) {
      console.error('❌ ElevenLabs API error:', error.response?.data || error.message);
      throw new ElevenLabsError('Failed to generate voice', { cause: error });
    }
  }

  async getVoices() {
    if (!this.apiKey || this.mockMode) {
      return [];
    }

    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      console.log(`✅ Found ${response.data.voices.length} voices`);
      return response.data.voices;
    } catch (error) {
      console.error('❌ Error fetching voices:', error);
      return [];
    }
  }

  private getMockAudioUrl(): string {
    return 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav';
  }

  isConfigured(): boolean {
    return !!this.apiKey && !this.mockMode;
  }
}

// Custom error class
export class ElevenLabsError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'ElevenLabsError';
  }
}
