import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';

export interface TikTokValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * TikTok-specific video validator service
 * Validates video specifications according to TikTok Content Posting API requirements
 *
 * Requirements:
 * - Duration: 3 seconds - 10 minutes
 * - File size: 5MB - 287MB (recommended 5MB-128MB for chunked upload)
 * - Format: MP4, MOV, WEBM
 * - Resolution: 1080x1920 (9:16 aspect ratio) recommended
 * - Codecs: H.264 video, AAC audio
 * - Frame rate: 24-60 fps
 */
@Injectable()
export class TikTokVideoValidatorService {
  private readonly logger = new Logger(TikTokVideoValidatorService.name);

  // TikTok specifications
  private readonly MIN_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_FILE_SIZE = 287 * 1024 * 1024; // 287MB (TikTok max)
  private readonly RECOMMENDED_MAX_SIZE = 128 * 1024 * 1024; // 128MB (recommended)
  private readonly MIN_DURATION = 3; // 3 seconds
  private readonly MAX_DURATION = 600; // 10 minutes
  private readonly SUPPORTED_FORMATS = ['.mp4', '.mov', '.webm'];
  private readonly ASPECT_RATIO_9_16 = 9 / 16;
  private readonly ASPECT_RATIO_TOLERANCE = 0.1;

  /**
   * Validate video file for TikTok upload
   */
  async validateVideo(videoPath: string): Promise<TikTokValidationResult> {
    const errors: string[] = [];

    // Check file exists
    if (!fs.existsSync(videoPath)) {
      return { isValid: false, errors: ['Video file does not exist'] };
    }

    // Get file stats
    const stats = fs.statSync(videoPath);
    const fileSize = stats.size;

    // Validate file size
    this.validateFileSize(fileSize, errors);

    // Validate file format
    this.validateFileFormat(videoPath, errors);

    // Log validation result
    const isValid = errors.length === 0;
    const sizeMB = (fileSize / 1024 / 1024).toFixed(2);

    if (isValid) {
      this.logger.log(`TikTok video validation passed: ${videoPath} (${sizeMB} MB)`);
    } else {
      this.logger.warn(
        `TikTok video validation failed: ${videoPath} (${sizeMB} MB) - ${errors.join(', ')}`,
      );
    }

    return {
      isValid,
      errors,
    };
  }

  /**
   * Validate file size
   */
  private validateFileSize(fileSize: number, errors: string[]): void {
    const sizeMB = fileSize / (1024 * 1024);

    if (fileSize < this.MIN_FILE_SIZE) {
      errors.push(`File size ${sizeMB.toFixed(2)} MB is below TikTok minimum of 5MB`);
    }

    if (fileSize > this.MAX_FILE_SIZE) {
      errors.push(`File size ${sizeMB.toFixed(2)} MB exceeds TikTok maximum of 287MB`);
    }

    // Warn if file is larger than recommended size
    if (fileSize > this.RECOMMENDED_MAX_SIZE) {
      this.logger.warn(
        `File size ${sizeMB.toFixed(2)} MB exceeds recommended maximum of 128MB. Upload may be slower.`,
      );
    }

    if (fileSize === 0) {
      errors.push('Video file is empty');
    }
  }

  /**
   * Validate file format
   */
  private validateFileFormat(videoPath: string, errors: string[]): void {
    const extension = videoPath.substring(videoPath.lastIndexOf('.')).toLowerCase();

    if (!this.SUPPORTED_FORMATS.includes(extension)) {
      errors.push(
        `File format ${extension} is not supported. Supported formats: ${this.SUPPORTED_FORMATS.join(', ')}`,
      );
    }
  }

  /**
   * Validate duration (requires ffprobe integration)
   * TODO: Implement with ffprobe for production
   */
  private validateDuration(duration: number, errors: string[]): void {
    if (duration < this.MIN_DURATION) {
      errors.push(`Duration ${duration}s is below TikTok minimum of 3 seconds`);
    }

    if (duration > this.MAX_DURATION) {
      errors.push(`Duration ${duration}s exceeds TikTok maximum of 10 minutes`);
    }
  }

  /**
   * Validate aspect ratio (requires ffprobe integration)
   * TODO: Implement with ffprobe for production
   */
  private validateAspectRatio(width: number, height: number, _errors: string[]): void {
    const aspectRatio = width / height;
    const diff = Math.abs(aspectRatio - this.ASPECT_RATIO_9_16);

    if (diff > this.ASPECT_RATIO_TOLERANCE) {
      this.logger.warn(
        `Aspect ratio ${aspectRatio.toFixed(2)} is not 9:16 (${this.ASPECT_RATIO_9_16.toFixed(2)}). Video may be cropped.`,
      );
      // Note: TikTok accepts various aspect ratios (0.75-1.33), but 9:16 is recommended
    }
  }

  /**
   * Get recommended chunk size for file
   * TikTok allows 5-64MB chunks, except last chunk can be >64MB up to 128MB
   */
  getChunkSize(fileSize: number): number {
    const DEFAULT_CHUNK_SIZE = 64 * 1024 * 1024; // 64MB

    // For files smaller than 64MB, use single chunk
    if (fileSize <= DEFAULT_CHUNK_SIZE) {
      return fileSize;
    }

    // For larger files, use 64MB chunks
    return DEFAULT_CHUNK_SIZE;
  }

  /**
   * Calculate number of chunks for file
   */
  getChunkCount(fileSize: number, chunkSize: number): number {
    return Math.ceil(fileSize / chunkSize);
  }
}
