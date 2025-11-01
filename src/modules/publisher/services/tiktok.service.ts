import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretsManagerService } from '../../../common/secrets/secrets-manager.service';
import { FileDownloaderService } from './file-downloader.service';
import { TikTokVideoValidatorService } from './tiktok-video-validator.service';
import { RateLimiterService } from './rate-limiter.service';
import { TiktokOAuth2Service } from './tiktok-oauth2.service';
import {
  TiktokAuthenticationError,
  TiktokUploadError,
  TiktokValidationError,
  TiktokChunkUploadError,
} from '../exceptions/tiktok.exceptions';
import { RateLimitError } from '../exceptions/youtube.exceptions';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';

interface UploadVideoParams {
  videoUrl: string;
  caption: string;
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

interface InitUploadResponse {
  uploadId: string;
  uploadUrl: string;
}

interface PublishResponse {
  publishId: string;
  videoId: string;
}

/**
 * TikTok Content Posting API Service
 * Handles TikTok video upload with chunked upload, OAuth2, and rate limiting
 *
 * Upload Flow:
 * 1. Initialize upload session (get upload_id and upload_url)
 * 2. Upload video chunks (5-64MB each)
 * 3. Publish video with metadata
 *
 * Rate Limits:
 * - 30 videos/day per user
 * - 6 requests/minute per access token
 * - Upload URL valid for 1 hour
 */
@Injectable()
export class TiktokService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TiktokService.name);
  private readonly httpClient: AxiosInstance;
  private readonly CHUNK_SIZE = 64 * 1024 * 1024; // 64MB chunks
  private readonly MAX_RETRIES = 3;
  private readonly TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

  constructor(
    private readonly config: ConfigService,
    private readonly secretsManager: SecretsManagerService,
    private readonly oauth: TiktokOAuth2Service,
    private readonly downloader: FileDownloaderService,
    private readonly validator: TikTokVideoValidatorService,
    private readonly rateLimiter: RateLimiterService,
  ) {
    this.httpClient = axios.create({
      timeout: 60000, // 1 minute timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async onModuleInit() {
    // OAuth2 service loads tokens automatically during initialization
    if (this.oauth.isAuthenticated()) {
      this.logger.log('TikTok service initialized with OAuth2 credentials');
    }
  }

  onModuleDestroy() {
    // Cleanup resources
  }

  /**
   * Upload video to TikTok
   * Steps:
   * 1. Authenticate with OAuth2
   * 2. Download video from URL
   * 3. Validate video specs
   * 4. Check rate limits
   * 5. Initialize upload session
   * 6. Upload video chunks
   * 7. Publish video
   * 8. Return video ID + URL
   */
  async uploadVideo(params: UploadVideoParams): Promise<UploadResult> {
    const startTime = Date.now();

    try {
      // 1. Ensure valid access token
      const accessToken = await this.oauth.ensureValidToken();
      if (!accessToken) {
        throw new TiktokAuthenticationError(
          'TikTok authentication required. Please authenticate via OAuth2 flow.',
        );
      }

      // 2. Check rate limits
      const canUpload = await this.rateLimiter.checkLimit('TIKTOK');
      if (!canUpload) {
        throw new RateLimitError('TikTok daily quota exceeded (30 videos/day). Retry tomorrow.');
      }

      // 3. Download video
      this.logger.log(`Downloading video from: ${params.videoUrl}`);
      const { path: videoPath, size } = await this.downloader.downloadVideo(params.videoUrl);

      // 4. Validate video
      const validation = await this.validator.validateVideo(videoPath);
      if (!validation.isValid) {
        await this.downloader.cleanupFile(videoPath);
        throw new TiktokValidationError(
          `Video invalid for TikTok: ${validation.errors.join(', ')}`,
        );
      }

      // 5. Initialize upload session
      this.logger.log('Initializing TikTok upload session');
      const { uploadId, uploadUrl } = await this.initUpload(accessToken, size);

      // 6. Upload video chunks
      this.logger.log(`Uploading video in chunks: ${(size / 1024 / 1024).toFixed(2)} MB`);
      await this.uploadVideoChunks(uploadUrl, videoPath);

      // 7. Publish video
      this.logger.log('Publishing video to TikTok');
      const { videoId } = await this.publishVideo(accessToken, uploadId, params.caption);

      // 8. Consume rate limit token
      await this.rateLimiter.consumeToken('TIKTOK');

      // 9. Cleanup
      await this.downloader.cleanupFile(videoPath);

      const duration = Date.now() - startTime;

      this.logger.log(
        `TikTok upload successful: ${videoId} (${(duration / 1000).toFixed(1)}s, ${(size / 1024 / 1024).toFixed(1)}MB)`,
      );

      return {
        videoId,
        url: `https://www.tiktok.com/@user/video/${videoId}`,
        platform: 'TIKTOK',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error(`TikTok upload failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Initialize upload session with TikTok
   * Returns upload ID and presigned upload URL (valid for 1 hour)
   */
  private async initUpload(accessToken: string, totalSize: number): Promise<InitUploadResponse> {
    try {
      const response = await this.httpClient.post(
        `${this.TIKTOK_API_BASE}/post/publish/video/init/`,
        {
          source: 'FILE_UPLOAD',
          chunk_size: this.CHUNK_SIZE,
          total_size: totalSize,
          filename: `video_${Date.now()}.mp4`,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.error || !response.data.data) {
        throw new TiktokUploadError(
          `Init upload failed: ${response.data.error?.message || 'Unknown error'}`,
        );
      }

      return {
        uploadId: response.data.data.upload_id,
        uploadUrl: response.data.data.upload_url,
      };
    } catch (error: any) {
      if (error instanceof TiktokUploadError) {
        throw error;
      }
      throw new TiktokUploadError(`Failed to initialize upload: ${error.message}`);
    }
  }

  /**
   * Upload video file in chunks to presigned URL
   * Each chunk: 5MB-64MB (except last chunk which can be >64MB up to 128MB)
   *
   * Uses exponential backoff for retries: 1s, 2s, 4s
   */
  private async uploadVideoChunks(uploadUrl: string, videoPath: string): Promise<void> {
    const fileSize = fs.statSync(videoPath).size;
    const fileHandle = fs.openSync(videoPath, 'r');

    try {
      let uploadedBytes = 0;
      let chunkIndex = 0;

      while (uploadedBytes < fileSize) {
        const remainingBytes = fileSize - uploadedBytes;
        const chunkSize = Math.min(this.CHUNK_SIZE, remainingBytes);
        const buffer = Buffer.alloc(chunkSize);

        // Read chunk from file
        fs.readSync(fileHandle, buffer, 0, chunkSize, uploadedBytes);

        // Upload chunk with retry
        await this.uploadChunkWithRetry(
          uploadUrl,
          buffer,
          uploadedBytes,
          uploadedBytes + chunkSize - 1,
          fileSize,
          chunkIndex,
        );

        uploadedBytes += chunkSize;
        chunkIndex++;

        this.logger.log(
          `Uploaded chunk ${chunkIndex}: ${(uploadedBytes / 1024 / 1024).toFixed(2)} MB / ${(fileSize / 1024 / 1024).toFixed(2)} MB`,
        );
      }

      this.logger.log('All chunks uploaded successfully');
    } finally {
      fs.closeSync(fileHandle);
    }
  }

  /**
   * Upload single chunk with retry logic
   */
  private async uploadChunkWithRetry(
    uploadUrl: string,
    chunk: Buffer,
    start: number,
    end: number,
    total: number,
    chunkIndex: number,
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const contentRange = `bytes ${start}-${end}/${total}`;

        await this.httpClient.put(uploadUrl, chunk, {
          headers: {
            'Content-Range': contentRange,
            'Content-Length': chunk.length.toString(),
            'Content-Type': 'video/mp4',
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });

        // Success
        return;
      } catch (error: any) {
        lastError = error;
        this.logger.warn(
          `Chunk ${chunkIndex} upload attempt ${attempt + 1} failed: ${error.message}`,
        );

        if (attempt < this.MAX_RETRIES - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new TiktokChunkUploadError(
      `Failed to upload chunk ${chunkIndex} after ${this.MAX_RETRIES} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Publish video after upload complete
   * Adds #TikTok hashtag to description
   * Returns publish ID and video ID
   */
  private async publishVideo(
    accessToken: string,
    uploadId: string,
    caption: string,
  ): Promise<PublishResponse> {
    try {
      // Add #TikTok hashtag if not present
      const finalCaption = caption.includes('#TikTok') ? caption : `${caption} #TikTok`;

      const response = await this.httpClient.post(
        `${this.TIKTOK_API_BASE}/post/publish/video/`,
        {
          source_info: {
            source: 'FILE_UPLOAD',
            video: {
              upload_id: uploadId,
            },
          },
          post_info: {
            title: finalCaption.substring(0, 150), // Max 150 chars
            description: finalCaption.substring(0, 2200), // Max 2200 chars
            disable_comment: false,
            disable_duet: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 5000, // 5 seconds for cover
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.error || !response.data.data) {
        throw new TiktokUploadError(
          `Publish failed: ${response.data.error?.message || 'Unknown error'}`,
        );
      }

      return {
        publishId: response.data.data.publish_id,
        videoId: response.data.data.video_id || response.data.data.publish_id, // Fallback to publish_id if video_id not available
      };
    } catch (error: any) {
      if (error instanceof TiktokUploadError) {
        throw error;
      }
      throw new TiktokUploadError(`Failed to publish video: ${error.message}`);
    }
  }

  /**
   * Get video statistics
   * Requires user access token with user.info.basic scope
   */
  async getVideoStats(videoId: string): Promise<VideoStats> {
    try {
      const accessToken = this.oauth.getAccessToken();
      if (!accessToken) {
        return { views: 0, likes: 0, comments: 0, shares: 0 };
      }

      const response = await this.httpClient.get(
        `${this.TIKTOK_API_BASE}/post/publish/status/fetch`,
        {
          params: { video_id: videoId },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const data = response.data.data || {};

      return {
        views: data.video_view_count || 0,
        likes: data.video_like_count || 0,
        comments: data.video_comment_count || 0,
        shares: data.video_share_count || 0,
      };
    } catch (error: any) {
      this.logger.warn(`Failed to fetch TikTok stats for ${videoId}: ${error.message}`);
      return { views: 0, likes: 0, comments: 0, shares: 0 };
    }
  }

  /**
   * Check if TikTok is configured and authenticated
   */
  isConfigured(): boolean {
    return this.oauth.isAuthenticated();
  }
}
