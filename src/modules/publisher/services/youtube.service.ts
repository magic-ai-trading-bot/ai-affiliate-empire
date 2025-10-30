import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretsManagerService } from '../../../common/secrets/secrets-manager.service';

interface UploadShortParams {
  videoUrl: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
}

@Injectable()
export class YoutubeService implements OnModuleInit {
  private clientId: string = '';
  private clientSecret: string = '';

  constructor(
    private readonly config: ConfigService,
    private readonly secretsManager: SecretsManagerService,
  ) {}

  async onModuleInit() {
    // Retrieve YouTube credentials from Secrets Manager
    const secrets = await this.secretsManager.getSecrets([
      { secretName: 'youtube-client-id', envVarName: 'YOUTUBE_CLIENT_ID' },
      { secretName: 'youtube-client-secret', envVarName: 'YOUTUBE_CLIENT_SECRET' },
    ]);

    this.clientId = secrets['youtube-client-id'] || '';
    this.clientSecret = secrets['youtube-client-secret'] || '';

    if (this.clientId && this.clientSecret) {
      console.log('✅ YouTube service initialized with credentials');
    }
  }

  /**
   * Upload video as YouTube Short
   *
   * Requires:
   * 1. OAuth2 authentication with YouTube Data API
   * 2. Video file must be vertical (9:16 aspect ratio)
   * 3. Duration must be 60 seconds or less
   */
  async uploadShort(params: UploadShortParams): Promise<{ videoId: string; url: string }> {
    const { videoUrl, title, description, thumbnailUrl } = params;

    console.log(`📺 YouTube: Uploading Short - ${title}`);

    if (!this.clientId || !this.clientSecret) {
      console.warn('⚠️ YouTube credentials not configured, returning mock data');
      return this.getMockUploadResult();
    }

    try {
      // TODO: Implement YouTube Data API v3 upload
      // Steps:
      // 1. Download video from videoUrl
      // 2. Authenticate with OAuth2
      // 3. Upload video with metadata
      // 4. Set as Short (add #Shorts to title/description)
      // 5. Upload custom thumbnail if provided

      console.warn('⚠️ YouTube API integration pending, returning mock data');
      return this.getMockUploadResult();
    } catch (error) {
      console.error('Error uploading to YouTube:', error);
      throw error;
    }
  }

  /**
   * Get upload statistics
   */
  async getVideoStats(videoId: string) {
    // TODO: Fetch video statistics from YouTube Data API
    return {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };
  }

  /**
   * Mock upload result for development
   */
  private getMockUploadResult(): { videoId: string; url: string } {
    const mockVideoId = `YT${Date.now()}`;
    return {
      videoId: mockVideoId,
      url: `https://youtube.com/shorts/${mockVideoId}`,
    };
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }
}
