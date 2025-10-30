import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface GenerateVideoParams {
  prompt: string;
  duration: number;
  style?: string;
  aspectRatio?: string;
}

interface VideoGeneration {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

@Injectable()
export class PikaLabsService {
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly mockMode: boolean;
  private readonly storageDir: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get('PIKALABS_API_KEY') || '';
    this.apiUrl = this.config.get('PIKALABS_API_URL') || 'https://api.pikalabs.com/v1';
    this.mockMode = this.config.get('PIKALABS_MOCK_MODE') === 'true';
    this.storageDir = this.config.get('STORAGE_DIR') || '/tmp/videos';

    // Create storage directory if it doesn't exist
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    if (!this.apiKey || this.mockMode) {
      console.warn('⚠️  Pika Labs running in MOCK MODE');
    }
  }

  async generateVideo(params: GenerateVideoParams): Promise<string> {
    const { prompt, duration, aspectRatio = '9:16' } = params;

    console.log(`🎨 Generating video: ${duration}s, prompt: ${prompt.substring(0, 50)}...`);

    if (!this.apiKey || this.mockMode) {
      return this.getMockVideoUrl();
    }

    try {
      // Initiate video generation
      const response = await axios.post(
        `${this.apiUrl}/generate`,
        {
          prompt,
          duration,
          aspect_ratio: aspectRatio,
          quality: 'high',
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const generationId = response.data.id;
      console.log(`📹 Video generation started: ${generationId}`);

      // Poll for completion
      const videoUrl = await this.pollForCompletion(generationId);

      // Download and save video
      const savedPath = await this.downloadVideo(videoUrl, generationId);

      console.log(`✅ Video generated: ${savedPath}`);
      return savedPath;
    } catch (error: any) {
      console.error('❌ Pika Labs API error:', error.response?.data || error.message);
      throw new PikaLabsError('Failed to generate video', { cause: error });
    }
  }

  private async pollForCompletion(
    generationId: string,
    maxAttempts: number = 60,
    pollInterval: number = 10000,
  ): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await axios.get(`${this.apiUrl}/status/${generationId}`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        });

        const status: VideoGeneration = response.data;

        if (status.status === 'completed' && status.videoUrl) {
          return status.videoUrl;
        }

        if (status.status === 'failed') {
          throw new Error(`Video generation failed: ${status.error}`);
        }

        console.log(`⏳ Video generation ${status.status} (${attempt + 1}/${maxAttempts})`);

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error: any) {
        if (error.response?.status === 404) {
          // Generation not found yet, continue polling
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          continue;
        }
        throw error;
      }
    }

    throw new Error('Video generation timeout - exceeded maximum wait time');
  }

  private async downloadVideo(url: string, id: string): Promise<string> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });

    const filename = `video-${id}.mp4`;
    const filepath = path.join(this.storageDir, filename);
    fs.writeFileSync(filepath, Buffer.from(response.data));

    return filepath;
  }

  private getMockVideoUrl(): string {
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  }

  isConfigured(): boolean {
    return !!this.apiKey && !this.mockMode;
  }
}

// Custom error class
export class PikaLabsError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'PikaLabsError';
  }
}
