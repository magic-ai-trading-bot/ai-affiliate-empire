import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretsManagerService } from '../../../common/secrets/secrets-manager.service';
import { FileDownloaderService } from './file-downloader.service';
import { InstagramVideoValidatorService } from './instagram-video-validator.service';
import { RateLimiterService } from './rate-limiter.service';
import { InstagramOAuth2Service } from './instagram-oauth2.service';
import {
  InstagramAuthenticationError,
  InstagramContainerError,
  InstagramPublishError,
} from '../exceptions/instagram.exceptions';
import { RateLimitError, ValidationError } from '../exceptions/youtube.exceptions';
import axios, { AxiosInstance } from 'axios';

interface UploadReelParams {
  videoUrl: string;
  caption: string;
  validateLocally?: boolean;
}

interface UploadResult {
  videoId: string;
  url: string;
  platform: string;
  status: string;
  publishedAt: Date;
}

interface MediaInsights {
  impressions: number;
  reach: number;
  engagement: number;
  saves: number;
  shares: number;
}

interface VideoStats {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

/**
 * Instagram Graph API Service
 * Handles Instagram Reels upload with container-based flow and long-lived tokens
 *
 * Upload Flow:
 * 1. Validate video URL (HTTPS required)
 * 2. Create media container with video URL
 * 3. Poll until container is ready (upload_status = "FINISHED")
 * 4. Publish media container
 * 5. Fetch published permalink
 *
 * Rate Limits: 25 posts/day (recommend 10 Reels)
 * Token Expiry: 60 days (refresh before expiry)
 */
@Injectable()
export class InstagramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InstagramService.name);
  private readonly httpClient: AxiosInstance;
  private readonly API_VERSION = 'v19.0';

  constructor(
    private readonly config: ConfigService,
    private readonly secretsManager: SecretsManagerService,
    private readonly oauth: InstagramOAuth2Service,
    private readonly downloader: FileDownloaderService,
    private readonly validator: InstagramVideoValidatorService,
    private readonly rateLimiter: RateLimiterService,
  ) {
    this.httpClient = axios.create({
      timeout: 60000, // 60 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async onModuleInit() {
    // Attempt to get token which will load tokens internally
    await this.oauth.ensureValidToken().catch(() => {
      // Ignore errors during initialization
    });

    if (this.oauth.isAuthenticated()) {
      const remainingDays = this.oauth.getRemainingDays();
      this.logger.log(
        `Instagram service initialized with OAuth2 credentials (${remainingDays} days remaining)`,
      );

      if (remainingDays < 10 && remainingDays > 0) {
        this.logger.warn(
          `Instagram token expires in ${remainingDays} days. Consider refreshing soon!`,
        );
      }
    } else {
      this.logger.warn('Instagram service initialized without valid credentials');
    }
  }

  onModuleDestroy() {
    // Cleanup resources
  }

  /**
   * Upload video as Instagram Reel
   * Two-step process:
   * 1. Create media container with video URL
   * 2. Publish container to make it visible
   *
   * Rate limits: 25 posts/day (recommend 10 Reels)
   * Token expiry: 60 days (refresh if needed)
   */
  async uploadReel(params: UploadReelParams): Promise<UploadResult> {
    const startTime = Date.now();

    try {
      // 1. Ensure valid long-lived token (refresh if needed)
      const accessToken = await this.oauth.ensureValidToken();
      if (!accessToken) {
        throw new InstagramAuthenticationError(
          'Instagram authentication required. Please authenticate via OAuth2 flow.',
        );
      }

      // 2. Check token expiry (warn if < 10 days remaining)
      const remainingDays = this.oauth.getRemainingDays();
      if (remainingDays < 10 && remainingDays > 0) {
        this.logger.warn(`Instagram token expires in ${remainingDays} days. Refresh recommended!`);
      }

      // 3. Check rate limits
      const canUpload = await this.rateLimiter.checkLimit('INSTAGRAM');
      if (!canUpload) {
        throw new RateLimitError('Instagram daily quota exceeded (25 posts/day). Retry tomorrow.');
      }

      // 4. Validate URL is HTTPS and accessible
      this.validateUrl(params.videoUrl);

      // 5. Optionally validate video locally before upload
      if (params.validateLocally) {
        this.logger.log(`Downloading video for local validation: ${params.videoUrl}`);
        const { path: videoPath } = await this.downloader.downloadVideo(params.videoUrl);

        const validation = await this.validator.validateForInstagram(videoPath);
        if (!validation.isValid) {
          await this.downloader.cleanupFile(videoPath);
          throw new ValidationError(`Video invalid for Instagram: ${validation.errors.join(', ')}`);
        }

        await this.downloader.cleanupFile(videoPath);
        this.logger.log('Local video validation passed');
      }

      // 6. Get business account ID from OAuth service
      const businessAccountId = await this.oauth.getBusinessAccountId();

      // 7. Add Instagram-specific hashtags to caption
      const finalCaption = this.enhanceCaptionWithHashtags(params.caption);

      // 8. Create media container
      this.logger.log(`Creating media container for business account: ${businessAccountId}`);
      const { containerId } = await this.createMediaContainer(
        businessAccountId,
        params.videoUrl,
        finalCaption,
        accessToken,
      );

      // 9. Poll until container is ready (upload_status = "FINISHED")
      this.logger.log(`Polling container status: ${containerId}`);
      await this.pollUntilReady(containerId, businessAccountId, accessToken);

      // 10. Publish media container
      this.logger.log(`Publishing media container: ${containerId}`);
      const { mediaId } = await this.publishMediaContainer(
        containerId,
        businessAccountId,
        accessToken,
      );

      // 11. Fetch published permalink
      const { permalink } = await this.getMediaPermalink(mediaId, accessToken);

      // 12. Consume rate limit
      await this.rateLimiter.consumeToken('INSTAGRAM');

      const duration = Date.now() - startTime;

      this.logger.log(`Instagram upload successful: ${mediaId} (${(duration / 1000).toFixed(1)}s)`);

      return {
        videoId: mediaId,
        url: permalink,
        platform: 'INSTAGRAM',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`Instagram upload failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create media container with video URL
   * Container must remain in "IN_PROGRESS" until published
   */
  private async createMediaContainer(
    businessAccountId: string,
    videoUrl: string,
    caption: string,
    accessToken: string,
  ): Promise<{ containerId: string }> {
    try {
      const response = await this.httpClient.post(
        `https://graph.instagram.com/${this.API_VERSION}/${businessAccountId}/media`,
        {
          video_url: videoUrl,
          media_type: 'REELS',
          caption: caption,
          access_role: 'OWNER',
        },
        {
          params: { access_token: accessToken },
        },
      );

      if (response.data.error) {
        throw new InstagramContainerError(
          `Container creation failed: ${response.data.error.message}`,
        );
      }

      const containerId = response.data.id;
      this.logger.log(`Media container created: ${containerId}`);

      return { containerId };
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new InstagramContainerError(
          `Container creation failed: ${error.response.data.error.message}`,
        );
      }
      throw new InstagramContainerError(`Container creation failed: ${error.message}`);
    }
  }

  /**
   * Poll media container until ready (upload_status = "FINISHED")
   * Instagram typically finishes in 1-3 minutes
   * Max wait: 10 minutes (60 attempts * 10 seconds)
   */
  private async pollUntilReady(
    containerId: string,
    businessAccountId: string,
    accessToken: string,
    maxAttempts: number = 60, // 60 * 10s = 10 minutes
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await this.httpClient.get(
          `https://graph.instagram.com/${this.API_VERSION}/${containerId}`,
          {
            params: {
              fields: 'upload_status,status_code',
              access_token: accessToken,
            },
          },
        );

        const uploadStatus = response.data.upload_status;
        const statusCode = response.data.status_code;

        this.logger.debug(
          `Container ${containerId} status: ${uploadStatus} (attempt ${attempt + 1}/${maxAttempts})`,
        );

        if (uploadStatus === 'FINISHED') {
          this.logger.log(`Container ${containerId} ready for publishing`);
          return;
        }

        if (uploadStatus === 'ERROR') {
          throw new InstagramContainerError(
            `Container upload failed with status code: ${statusCode}`,
          );
        }

        // Wait 10 seconds before retry
        await new Promise((resolve) => setTimeout(resolve, 10000));
      } catch (error: any) {
        if (error instanceof InstagramContainerError) {
          throw error;
        }

        if (attempt === maxAttempts - 1) {
          throw new InstagramContainerError(
            `Container polling timeout (>10 minutes): ${error.message}`,
          );
        }

        // Continue polling on network errors
        this.logger.warn(`Polling attempt ${attempt + 1} failed: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }

    throw new InstagramContainerError('Container upload timeout (>10 minutes)');
  }

  /**
   * Publish media container to make visible
   * This is the final step that makes the reel visible to users
   */
  private async publishMediaContainer(
    containerId: string,
    businessAccountId: string,
    accessToken: string,
  ): Promise<{ mediaId: string }> {
    try {
      const response = await this.httpClient.post(
        `https://graph.instagram.com/${this.API_VERSION}/${businessAccountId}/media_publish`,
        { creation_id: containerId },
        {
          params: { access_token: accessToken },
        },
      );

      if (response.data.error) {
        throw new InstagramPublishError(`Publish failed: ${response.data.error.message}`);
      }

      const mediaId = response.data.id;
      this.logger.log(`Media published successfully: ${mediaId}`);

      return { mediaId };
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new InstagramPublishError(`Publish failed: ${error.response.data.error.message}`);
      }
      throw new InstagramPublishError(`Publish failed: ${error.message}`);
    }
  }

  /**
   * Get media permalink (Instagram URL)
   */
  private async getMediaPermalink(
    mediaId: string,
    accessToken: string,
  ): Promise<{ permalink: string }> {
    try {
      const response = await this.httpClient.get(
        `https://graph.instagram.com/${this.API_VERSION}/${mediaId}`,
        {
          params: {
            fields: 'permalink',
            access_token: accessToken,
          },
        },
      );

      const permalink = response.data.permalink;
      this.logger.log(`Media permalink: ${permalink}`);

      return { permalink };
    } catch (error: any) {
      this.logger.warn(`Failed to fetch permalink: ${error.message}`);
      // Return placeholder URL if fetch fails
      return { permalink: `https://instagram.com/reel/${mediaId}` };
    }
  }

  /**
   * Get media insights (engagement metrics)
   * Requires instagram_insights permission
   */
  async getMediaInsights(mediaId: string): Promise<MediaInsights> {
    try {
      const accessToken = this.oauth.getAccessToken();
      if (!accessToken) {
        return this.getEmptyInsights();
      }

      const response = await this.httpClient.get(
        `https://graph.instagram.com/${this.API_VERSION}/${mediaId}/insights`,
        {
          params: {
            metric: 'engagement,impressions,reach,saved,shares',
            access_token: accessToken,
          },
        },
      );

      const insights: any = {};
      for (const item of response.data.data) {
        insights[item.name] = item.values[0]?.value || 0;
      }

      return {
        impressions: insights.impressions || 0,
        reach: insights.reach || 0,
        engagement: insights.engagement || 0,
        saves: insights.saved || 0,
        shares: insights.shares || 0,
      };
    } catch (error: any) {
      this.logger.warn(`Failed to fetch Instagram insights: ${error.message}`);
      return this.getEmptyInsights();
    }
  }

  /**
   * Map to VideoStats format (consistent with other platforms)
   */
  async getVideoStats(mediaId: string): Promise<VideoStats> {
    const insights = await this.getMediaInsights(mediaId);

    return {
      views: insights.impressions,
      likes: 0, // Instagram API doesn't expose likes directly
      comments: 0,
      shares: insights.shares,
    };
  }

  /**
   * Check if Instagram is configured and authenticated
   */
  isConfigured(): boolean {
    return this.oauth.isAuthenticated();
  }

  /**
   * Validate URL format and protocol
   */
  private validateUrl(url: string): void {
    if (!url.startsWith('https://')) {
      throw new ValidationError('Instagram requires HTTPS video URL');
    }

    try {
      new URL(url);
    } catch {
      throw new ValidationError('Invalid video URL format');
    }
  }

  /**
   * Enhance caption with Instagram-specific hashtags
   */
  private enhanceCaptionWithHashtags(caption: string): string {
    // If caption already has hashtags, return as-is
    if (caption.includes('#')) {
      return caption;
    }

    // Add common Instagram hashtags for Reels
    const instagramHashtags = ['#reels', '#viral', '#trending'];
    return `${caption}\n\n${instagramHashtags.join(' ')}`;
  }

  /**
   * Get empty insights object
   */
  private getEmptyInsights(): MediaInsights {
    return {
      impressions: 0,
      reach: 0,
      engagement: 0,
      saves: 0,
      shares: 0,
    };
  }
}
