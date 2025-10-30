import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface UploadReelParams {
  videoUrl: string;
  caption: string;
}

@Injectable()
export class InstagramService {
  private readonly accessToken: string;
  private readonly businessAccountId: string;

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.get('INSTAGRAM_ACCESS_TOKEN') || '';
    this.businessAccountId = this.config.get('INSTAGRAM_BUSINESS_ACCOUNT_ID') || '';
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

      console.warn('⚠️ Instagram API integration pending, returning mock data');
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
    const mockMediaId = `IG${Date.now()}`;
    return {
      mediaId: mockMediaId,
      url: `https://instagram.com/reel/${mockMediaId}`,
    };
  }

  isConfigured(): boolean {
    return !!(this.accessToken && this.businessAccountId);
  }
}
