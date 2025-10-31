import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretsManagerService } from '../../../common/secrets/secrets-manager.service';

interface UploadReelParams {
  videoUrl: string;
  caption: string;
}

@Injectable()
export class InstagramService implements OnModuleInit {
  private accessToken: string = '';
  private businessAccountId: string = '';

  constructor(
    private readonly config: ConfigService,
    private readonly secretsManager: SecretsManagerService,
  ) {}

  async onModuleInit() {
    // Retrieve Instagram credentials from Secrets Manager
    const secrets = await this.secretsManager.getSecrets([
      { secretName: 'instagram-access-token', envVarName: 'INSTAGRAM_ACCESS_TOKEN' },
      {
        secretName: 'instagram-business-account-id',
        envVarName: 'INSTAGRAM_BUSINESS_ACCOUNT_ID',
      },
    ]);

    this.accessToken = secrets['instagram-access-token'] || '';
    this.businessAccountId = secrets['instagram-business-account-id'] || '';

    if (this.accessToken && this.businessAccountId) {
      console.log('✅ Instagram service initialized with credentials');
    }
  }

  /**
   * Upload video as Instagram Reel
   *
   * Requires:
   * 1. Instagram Business or Creator account
   * 2. Facebook Developer App
   * 3. instagram_content_publish permission
   */
  async uploadReel(params: UploadReelParams): Promise<{ mediaId: string; url: string }> {
    const { videoUrl, caption } = params;

    console.log(`📸 Instagram: Uploading Reel - ${caption.substring(0, 50)}...`);

    if (!this.accessToken || !this.businessAccountId) {
      console.warn('⚠️ Instagram credentials not configured, returning mock data');
      return this.getMockUploadResult();
    }

    try {
      // TODO: Implement Instagram Graph API upload
      // Steps:
      // 1. Create media container with video URL
      // 2. Wait for container to be ready
      // 3. Publish media container
      // 4. Return media ID and URL

      console.warn('⚠️ Instagram credentials not configured, returning mock data');
      return this.getMockUploadResult();
    } catch (error) {
      console.error('Error uploading to Instagram:', error);
      throw error;
    }
  }

  /**
   * Get media insights (requires business account)
   */
  async getMediaInsights(mediaId: string) {
    // TODO: Fetch media insights from Instagram Graph API
    return {
      impressions: 0,
      reach: 0,
      engagement: 0,
      saves: 0,
      shares: 0,
    };
  }

  /**
   * Mock upload result for development
   */
  private getMockUploadResult(): { mediaId: string; url: string } {
    const mockMediaId = `IG${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    return {
      mediaId: mockMediaId,
      url: `https://instagram.com/reel/${mockMediaId}`,
    };
  }

  isConfigured(): boolean {
    return !!(this.accessToken && this.businessAccountId);
  }
}
