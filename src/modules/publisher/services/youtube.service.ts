import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface UploadShortParams {
  videoUrl: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
}

@Injectable()
export class YoutubeService {
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get('YOUTUBE_CLIENT_ID') || '';
    this.clientSecret = this.config.get('YOUTUBE_CLIENT_SECRET') || '';
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
