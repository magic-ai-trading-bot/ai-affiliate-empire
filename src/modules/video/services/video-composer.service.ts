import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FFmpegService } from './ffmpeg.service';
import { FileStorageService } from './file-storage.service';
import { ProgressTrackerService } from './progress-tracker.service';
import { ThumbnailGeneratorService } from './thumbnail-generator.service';
import {
  // VideoCompositionError,
  VideoErrorFactory,
  isRecoverableError,
} from '../../../common/exceptions/video-composition.error';
import PQueue from 'p-queue';

interface ComposeParams {
  voiceUrl: string;
  visualsUrl: string;
  script: string;
  product: any;
}

interface ThumbnailParams {
  videoUrl: string;
  productTitle: string;
}

interface CompositionResult {
  success: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: Error;
  duration?: number;
}

@Injectable()
export class VideoComposerService {
  private readonly logger = new Logger(VideoComposerService.name);
  private readonly compositionQueue: PQueue;
  private readonly maxRetries: number;

  constructor(
    private readonly config: ConfigService,
    private readonly ffmpeg: FFmpegService,
    private readonly fileStorage: FileStorageService,
    private readonly progressTracker: ProgressTrackerService,
    private readonly thumbnailGenerator: ThumbnailGeneratorService,
  ) {
    const concurrency = this.config.get<number>('STORAGE_MAX_PARALLEL', 5);
    this.compositionQueue = new PQueue({ concurrency });
    this.maxRetries = 3;

    this.logger.log(`VideoComposer initialized with concurrency: ${concurrency}`);
  }

  /**
   * Compose final video by combining voice and visuals
   */
  async compose(params: ComposeParams): Promise<string> {
    const { voiceUrl, visualsUrl, product } = params;
    const videoId = product?.id || `video-${Date.now()}`;

    this.logger.log(`Composing video for product: ${product?.title || 'unknown'}`);

    // Start progress tracking
    this.progressTracker.startTracking(videoId);

    try {
      // Step 1: Download source files
      this.progressTracker.onProgress(videoId, 'downloading', 0, 30, 'Downloading audio');
      const voicePath = await this.fileStorage.downloadFile(voiceUrl);

      this.progressTracker.onProgress(videoId, 'downloading', 50, 20, 'Downloading visuals');
      const visualsPath = await this.fileStorage.downloadFile(visualsUrl);

      this.progressTracker.onProgress(videoId, 'downloading', 100, 0, 'Downloads complete');

      // Step 2: Validate sources
      await this.validateSources(voicePath, visualsPath);

      // Step 3: Get metadata
      this.progressTracker.onProgress(videoId, 'merging', 0, 25, 'Analyzing video metadata');
      const videoInfo = await this.ffmpeg.getVideoInfo(visualsPath);
      const audioInfo = await this.ffmpeg.getVideoInfo(voicePath);

      // Step 4: Normalize audio duration
      this.progressTracker.onProgress(videoId, 'merging', 30, 20, 'Normalizing audio');
      const normalizedAudioPath = await this.normalizeAudioDuration(
        voicePath,
        videoInfo.duration,
        audioInfo.duration,
      );

      // Step 5: Compose with FFmpeg
      this.progressTracker.onProgress(videoId, 'encoding', 0, 30, 'Encoding video');
      const outputPath = this.fileStorage.getTempPath(`composed-${videoId}.mp4`);

      await this.ffmpeg.composeVideo(
        normalizedAudioPath,
        visualsPath,
        outputPath,
        {
          maxDuration: this.config.get<number>('VIDEO_MAX_DURATION', 60),
          videoBitrate: this.config.get<string>('VIDEO_OUTPUT_BITRATE', '7000k'),
          audioBitrate: this.config.get<string>('VIDEO_AUDIO_BITRATE', '160k'),
          fps: this.config.get<number>('VIDEO_FPS', 30),
        },
        (progress) => {
          this.progressTracker.onProgress(videoId, 'encoding', progress, 0, 'Encoding...');
        },
      );

      // Step 6: Validate output
      await this.validateOutput(outputPath);

      // Step 7: Upload result
      this.progressTracker.onProgress(videoId, 'uploading', 0, 15, 'Uploading to storage');
      const cdnUrl = await this.fileStorage.uploadFile(
        outputPath,
        `videos/composed/${videoId}.mp4`,
        { contentType: 'video/mp4' },
      );

      this.progressTracker.onProgress(videoId, 'uploading', 100, 0, 'Upload complete');

      // Step 8: Cleanup
      await this.cleanupTempFiles([
        voicePath,
        visualsPath,
        normalizedAudioPath !== voicePath ? normalizedAudioPath : null,
        outputPath,
      ]);

      // Complete tracking
      this.progressTracker.completeTracking(videoId, true);

      this.logger.log(`Video composition complete: ${cdnUrl}`);
      return cdnUrl;
    } catch (error) {
      await this.handleCompositionError(videoId, error);
      throw error;
    }
  }

  /**
   * Generate thumbnail for video
   */
  async generateThumbnail(params: ThumbnailParams): Promise<string> {
    const { videoUrl, productTitle } = params;

    this.logger.log(`Generating thumbnail for: ${productTitle}`);

    try {
      // Download video
      const videoPath = await this.fileStorage.downloadFile(videoUrl);

      // Generate thumbnail
      const thumbnailUrl = await this.thumbnailGenerator.generateFromVideo(videoPath, {
        productTitle,
        resolution: {
          width: this.config.get<number>('THUMBNAIL_WIDTH', 1024),
          height: this.config.get<number>('THUMBNAIL_HEIGHT', 1024),
        },
      });

      // Cleanup
      await this.fileStorage.cleanupTempFile(videoPath);

      return thumbnailUrl;
    } catch (error) {
      this.logger.error(`Thumbnail generation failed: ${error.message}`);
      throw VideoErrorFactory.thumbnailFailed(error.message);
    }
  }

  /**
   * Add captions/subtitles to video
   */
  async addCaptions(videoUrl: string, script: string): Promise<string> {
    this.logger.log('Adding captions to video');

    try {
      // Download video
      const videoPath = await this.fileStorage.downloadFile(videoUrl);

      // For now, add script as text overlay at bottom
      const outputPath = this.fileStorage.getTempPath('captioned.mp4');

      // Simple implementation: add script text at bottom
      await this.ffmpeg.addTextOverlay(videoPath, outputPath, {
        text: this.truncateText(script, 100),
        fontSize: 24,
        fontColor: 'white',
        position: 'bottom',
        backgroundColor: 'black@0.7',
      });

      // Upload result
      const cdnUrl = await this.fileStorage.uploadFile(
        outputPath,
        `videos/captioned/${Date.now()}.mp4`,
        { contentType: 'video/mp4' },
      );

      // Cleanup
      await this.cleanupTempFiles([videoPath, outputPath]);

      return cdnUrl;
    } catch (error) {
      this.logger.error(`Caption addition failed: ${error.message}`);
      return videoUrl; // Return original if failed
    }
  }

  /**
   * Add watermark to video
   */
  async addWatermark(videoUrl: string, watermarkText: string): Promise<string> {
    this.logger.log('Adding watermark to video');

    try {
      const videoPath = await this.fileStorage.downloadFile(videoUrl);
      const outputPath = this.fileStorage.getTempPath('watermarked.mp4');

      await this.ffmpeg.addTextOverlay(videoPath, outputPath, {
        text: watermarkText,
        fontSize: 16,
        fontColor: 'white',
        position: 'top',
        backgroundColor: 'transparent',
      });

      const cdnUrl = await this.fileStorage.uploadFile(
        outputPath,
        `videos/watermarked/${Date.now()}.mp4`,
        { contentType: 'video/mp4' },
      );

      await this.cleanupTempFiles([videoPath, outputPath]);

      return cdnUrl;
    } catch (error) {
      this.logger.error(`Watermark addition failed: ${error.message}`);
      return videoUrl;
    }
  }

  /**
   * Batch compose multiple videos with concurrency control
   */
  async composeBatch(params: ComposeParams[]): Promise<CompositionResult[]> {
    this.logger.log(`Starting batch composition: ${params.length} videos`);

    const startTime = Date.now();
    const results: CompositionResult[] = [];

    // Process each video
    const promises = params.map((param) =>
      this.compositionQueue.add(async (): Promise<CompositionResult> => {
        const videoStartTime = Date.now();
        try {
          const videoUrl = await this.composeWithRetry(param);
          const thumbnailUrl = await this.generateThumbnail({
            videoUrl,
            productTitle: param.product?.title || 'Product',
          });

          return {
            success: true,
            videoUrl,
            thumbnailUrl,
            duration: Date.now() - videoStartTime,
          };
        } catch (error) {
          return {
            success: false,
            error: error as Error,
            duration: Date.now() - videoStartTime,
          };
        }
      }),
    );

    // Wait for all to complete
    const settled = await Promise.allSettled(promises);

    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          error: result.status === 'rejected' ? result.reason : new Error('Unknown error'),
        });
      }
    }

    const duration = Date.now() - startTime;
    const successCount = results.filter((r) => r.success).length;

    this.logger.log(
      `Batch composition complete: ${successCount}/${params.length} successful in ${Math.round(duration / 1000)}s`,
    );

    return results;
  }

  /**
   * Compose with retry logic
   */
  private async composeWithRetry(params: ComposeParams, maxRetries: number = 3): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.compose(params);
      } catch (error) {
        lastError = error as Error;

        if (!isRecoverableError(error as Error)) {
          this.logger.error(`Non-recoverable error, aborting retry`);
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          this.logger.warn(`Retry attempt ${attempt}/${maxRetries} in ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Normalize audio duration to match video
   */
  private async normalizeAudioDuration(
    audioPath: string,
    videoDuration: number,
    audioDuration: number,
  ): Promise<string> {
    this.logger.debug(`Normalizing audio: video=${videoDuration}s, audio=${audioDuration}s`);

    const tolerance = 0.5; // 0.5 second tolerance

    if (Math.abs(audioDuration - videoDuration) < tolerance) {
      this.logger.debug('Audio duration matches video, no normalization needed');
      return audioPath;
    }

    if (audioDuration > videoDuration) {
      this.logger.log(`Trimming audio from ${audioDuration}s to ${videoDuration}s`);
      return await this.ffmpeg.trimAudio(audioPath, videoDuration);
    } else {
      this.logger.log(`Padding audio from ${audioDuration}s to ${videoDuration}s`);
      return await this.ffmpeg.padAudio(audioPath, videoDuration);
    }
  }

  /**
   * Validate source files
   */
  private async validateSources(voicePath: string, visualsPath: string): Promise<void> {
    try {
      await this.fileStorage.validateFile(voicePath, 'audio');
      await this.fileStorage.validateFile(visualsPath, 'video');
    } catch (error) {
      throw VideoErrorFactory.invalidSource('source', error.message);
    }
  }

  /**
   * Validate output file
   */
  private async validateOutput(outputPath: string): Promise<void> {
    try {
      await this.fileStorage.validateFile(outputPath, 'video');
      const metadata = await this.ffmpeg.getVideoInfo(outputPath);

      if (metadata.duration === 0) {
        throw new Error('Output video has zero duration');
      }

      if (!metadata.hasAudio) {
        throw new Error('Output video has no audio');
      }
    } catch (error) {
      throw VideoErrorFactory.compositionFailed(`Output validation failed: ${error.message}`);
    }
  }

  /**
   * Cleanup temporary files
   */
  private async cleanupTempFiles(filepaths: (string | null)[]): Promise<void> {
    await Promise.all(
      filepaths
        .filter((path): path is string => path !== null)
        .map((path) => this.fileStorage.cleanupTempFile(path)),
    );
  }

  /**
   * Handle composition error
   */
  private async handleCompositionError(videoId: string, error: any): Promise<void> {
    this.logger.error(`Composition failed for ${videoId}: ${error.message}`);
    this.progressTracker.completeTracking(videoId, false);

    // Cleanup any temp files that might exist
    // This is a best-effort cleanup
    try {
      await this.fileStorage.cleanupOldFiles(0);
    } catch (cleanupError) {
      this.logger.warn(`Cleanup after error failed: ${cleanupError.message}`);
    }
  }

  /**
   * Truncate text to max length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }
}
