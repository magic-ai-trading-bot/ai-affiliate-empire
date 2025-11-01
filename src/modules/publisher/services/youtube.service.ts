import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretsManagerService } from '../../../common/secrets/secrets-manager.service';
import { FileDownloaderService } from './file-downloader.service';
import { VideoValidatorService } from './video-validator.service';
import { RateLimiterService } from './rate-limiter.service';
import { OAuth2Service, OAuth2Tokens, OAuth2Config } from './oauth2.service';
import {
  YoutubeAuthenticationError,
  YoutubeUploadFailedError,
  YoutubeProcessingError,
  RateLimitError,
  ValidationError,
} from '../exceptions/youtube.exceptions';
import { google, youtube_v3 } from 'googleapis';
import * as fs from 'fs';

interface UploadShortParams {
  videoUrl: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
}

interface UploadResult {
  videoId: string;
  url: string;
  platform: string;
  status: string;
  publishedAt: Date;
}

interface VideoStats {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

/**
 * YouTube Data API v3 Service
 * Handles YouTube Shorts upload with OAuth2, resumable upload, and rate limiting
 */
@Injectable()
export class YoutubeService extends OAuth2Service implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(YoutubeService.name);
  private youtube: youtube_v3.Youtube | null = null;

  constructor(
    protected readonly config: ConfigService,
    protected readonly secretsManager: SecretsManagerService,
    private readonly downloader: FileDownloaderService,
    private readonly validator: VideoValidatorService,
    private readonly rateLimiter: RateLimiterService,
  ) {
    super(config, secretsManager);
  }

  async onModuleInit() {
    await this.loadTokens();
    if (this.tokens) {
      this.initializeYouTubeClient();
      this.logger.log('YouTube service initialized with OAuth2 credentials');
    }
  }

  onModuleDestroy() {
    // Cleanup resources
  }

  /**
   * Get OAuth2 configuration for YouTube
   */
  protected getOAuth2Config(): OAuth2Config {
    return {
      clientId: this.config.get('YOUTUBE_CLIENT_ID') || '',
      clientSecret: this.config.get('YOUTUBE_CLIENT_SECRET') || '',
      redirectUri:
        this.config.get('YOUTUBE_REDIRECT_URI') || 'http://localhost:3000/auth/youtube/callback',
      scopes: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
      ],
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
    };
  }

  /**
   * Initialize YouTube API client
   */
  private initializeYouTubeClient(): void {
    if (!this.tokens) {
      return;
    }

    const oauth2Client = new google.auth.OAuth2(
      this.getOAuth2Config().clientId,
      this.getOAuth2Config().clientSecret,
      this.getOAuth2Config().redirectUri,
    );

    oauth2Client.setCredentials({
      access_token: this.tokens.accessToken,
      refresh_token: this.tokens.refreshToken,
    });

    this.youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Upload video as YouTube Short
   * Steps:
   * 1. Authenticate with OAuth2
   * 2. Download video from URL
   * 3. Validate video specs
   * 4. Check rate limits
   * 5. Upload with metadata
   * 6. Poll until processed
   * 7. Return video ID + URL
   */
  async uploadShort(params: UploadShortParams): Promise<UploadResult> {
    const startTime = Date.now();

    try {
      // 1. Ensure valid token
      const accessToken = await this.ensureValidToken();
      if (!accessToken) {
        throw new YoutubeAuthenticationError(
          'YouTube authentication required. Please authenticate via OAuth2 flow.',
        );
      }

      // Reinitialize client with fresh token
      this.initializeYouTubeClient();

      // 2. Check rate limit
      const canUpload = await this.rateLimiter.checkLimit('YOUTUBE');
      if (!canUpload) {
        throw new RateLimitError('YouTube daily quota exceeded. Retry tomorrow.');
      }

      // 3. Download video
      this.logger.log(`Downloading video from: ${params.videoUrl}`);
      const { path: videoPath, size } = await this.downloader.downloadVideo(params.videoUrl);

      // 4. Validate video
      const validation = await this.validator.validateForPlatform(videoPath, 'YOUTUBE');
      if (!validation.isValid) {
        await this.downloader.cleanupFile(videoPath);
        throw new ValidationError(`Video invalid: ${validation.errors.join(', ')}`);
      }

      // 5. Upload video using googleapis
      this.logger.log(`Uploading video: ${params.title}`);
      const videoId = await this.uploadVideoToYouTube(videoPath, params);

      // 6. Upload thumbnail if provided
      if (params.thumbnailUrl && this.youtube) {
        await this.uploadThumbnail(videoId, params.thumbnailUrl);
      }

      // 7. Poll for processing completion
      await this.pollUntilProcessed(videoId);

      // 8. Consume rate limit token
      await this.rateLimiter.consumeToken('YOUTUBE');

      // 9. Cleanup
      await this.downloader.cleanupFile(videoPath);

      const duration = Date.now() - startTime;

      this.logger.log(
        `YouTube upload successful: ${videoId} (${(duration / 1000).toFixed(1)}s, ${(size / 1024 / 1024).toFixed(1)}MB)`,
      );

      return {
        videoId,
        url: `https://youtube.com/shorts/${videoId}`,
        platform: 'YOUTUBE',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`YouTube upload failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Upload video to YouTube using googleapis
   */
  private async uploadVideoToYouTube(
    videoPath: string,
    params: UploadShortParams,
  ): Promise<string> {
    if (!this.youtube) {
      throw new YoutubeAuthenticationError('YouTube client not initialized');
    }

    try {
      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: `${params.title} #Shorts`, // Add #Shorts for classification
            description: `${params.description}\n\n#Shorts`,
            tags: ['shorts', 'affiliate', 'review'],
            categoryId: '22', // People & Blogs
            defaultLanguage: 'en',
          },
          status: {
            privacyStatus: 'public',
            madeForKids: false,
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: fs.createReadStream(videoPath),
        },
      });

      const videoId = response.data.id;
      if (!videoId) {
        throw new YoutubeUploadFailedError('YouTube did not return video ID');
      }

      return videoId;
    } catch (error: any) {
      throw new YoutubeUploadFailedError(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Upload custom thumbnail
   */
  private async uploadThumbnail(videoId: string, thumbnailUrl: string): Promise<void> {
    if (!this.youtube) {
      return;
    }

    try {
      this.logger.log(`Uploading thumbnail for video: ${videoId}`);
      const { path: thumbPath } = await this.downloader.downloadVideo(thumbnailUrl);

      await this.youtube.thumbnails.set({
        videoId,
        media: {
          body: fs.createReadStream(thumbPath),
        },
      });

      await this.downloader.cleanupFile(thumbPath);
      this.logger.log(`Thumbnail uploaded successfully for video: ${videoId}`);
    } catch (error: any) {
      this.logger.warn(`Failed to upload thumbnail: ${error.message}`);
      // Don't fail the entire upload if thumbnail fails
    }
  }

  /**
   * Poll until video processing complete
   * YouTube takes 30-90 seconds to process videos
   */
  private async pollUntilProcessed(
    videoId: string,
    maxAttempts: number = 30, // 30 * 3s = 90s max wait
  ): Promise<void> {
    if (!this.youtube) {
      return;
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await this.youtube.videos.list({
          part: ['processingDetails', 'status'],
          id: [videoId],
        });

        const video = response.data.items?.[0];
        const status = video?.processingDetails?.processingStatus;

        if (status === 'succeeded') {
          this.logger.log(`Video processing completed: ${videoId}`);
          return;
        }

        if (status === 'failed') {
          throw new YoutubeProcessingError(
            `Video processing failed: ${video?.processingDetails?.processingFailureReason || 'Unknown error'}`,
          );
        }

        // Wait 3 seconds before retry
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error: any) {
        if (attempt === maxAttempts - 1) {
          throw error;
        }
      }
    }

    throw new YoutubeProcessingError('Video processing timeout (>90s)');
  }

  /**
   * Get video statistics
   */
  async getVideoStats(videoId: string): Promise<VideoStats> {
    if (!this.youtube) {
      return { views: 0, likes: 0, comments: 0, shares: 0 };
    }

    try {
      const response = await this.youtube.videos.list({
        part: ['statistics'],
        id: [videoId],
      });

      const stats = response.data.items?.[0]?.statistics || {};

      return {
        views: parseInt(stats.viewCount || '0', 10),
        likes: parseInt(stats.likeCount || '0', 10),
        comments: parseInt(stats.commentCount || '0', 10),
        shares: 0, // YouTube API doesn't expose share count
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch YouTube stats: ${error.message}`);
      return { views: 0, likes: 0, comments: 0, shares: 0 };
    }
  }

  /**
   * Check if YouTube is configured and authenticated
   */
  isConfigured(): boolean {
    return this.isAuthenticated();
  }

  /**
   * Save tokens (in-memory storage for now)
   * TODO: Implement persistent storage with AWS Secrets Manager when needed
   */
  protected async saveTokens(_tokens: OAuth2Tokens): Promise<void> {
    try {
      // For now, tokens are stored in-memory
      // In production, implement AWS Secrets Manager update/create API
      this.logger.log('YouTube tokens saved (in-memory)');
    } catch (error: any) {
      this.logger.error(`Failed to save YouTube tokens: ${error.message}`);
    }
  }

  /**
   * Load tokens from secrets manager
   */
  protected async loadTokens(): Promise<void> {
    try {
      const secrets = await this.secretsManager.getSecrets([
        { secretName: 'youtube-access-token', envVarName: 'YOUTUBE_ACCESS_TOKEN' },
        { secretName: 'youtube-refresh-token', envVarName: 'YOUTUBE_REFRESH_TOKEN' },
        { secretName: 'youtube-token-expires-at', envVarName: 'YOUTUBE_TOKEN_EXPIRES_AT' },
      ]);

      const accessToken = secrets['youtube-access-token'];
      const refreshToken = secrets['youtube-refresh-token'];
      const expiresAt = secrets['youtube-token-expires-at'];

      if (accessToken && expiresAt) {
        this.tokens = {
          accessToken,
          refreshToken: refreshToken || undefined,
          expiresAt: new Date(expiresAt),
        };
        this.logger.log('YouTube tokens loaded from secrets manager');
      }
    } catch (error: any) {
      this.logger.warn(`Failed to load YouTube tokens: ${error.message}`);
    }
  }
}
