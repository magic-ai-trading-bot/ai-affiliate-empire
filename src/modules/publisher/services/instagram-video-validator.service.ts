import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';

export interface InstagramValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Instagram-specific video validator service
 * Validates video specifications according to Instagram Reels requirements
 *
 * Instagram Reels Requirements:
 * - Duration: 3-90 seconds (5-90s recommended for Reels tab)
 * - Formats: MP4 (H.264 + AAC) or MOV (HEVC + AAC)
 * - Aspect ratio: 9:16 recommended (0.01:1 - 10:1 allowed)
 * - Resolution: 1080x1920 (9:16 vertical)
 * - Max file size: 100MB
 * - Frame rate: 23-60 fps
 * - Video codec: H.264 or HEVC, progressive scan, closed GOP, 4:2:0 chroma
 * - Audio codec: AAC, 48kHz, 1-2 channels (mono/stereo)
 * - Container: MP4/MOV with moov atom at front
 */
@Injectable()
export class InstagramVideoValidatorService {
  private readonly logger = new Logger(InstagramVideoValidatorService.name);

  // Instagram Reels constraints
  private readonly MIN_DURATION_SECONDS = 3;
  private readonly MAX_DURATION_SECONDS = 90;
  private readonly RECOMMENDED_MIN_DURATION = 5;
  private readonly MAX_FILE_SIZE_MB = 100;
  private readonly RECOMMENDED_WIDTH = 1080;
  private readonly RECOMMENDED_HEIGHT = 1920;
  private readonly RECOMMENDED_ASPECT_RATIO = 9 / 16;
  private readonly ASPECT_RATIO_TOLERANCE = 0.05;

  /**
   * Validate video for Instagram Reels
   */
  async validateForInstagram(videoPath: string): Promise<InstagramValidationResult> {
    const errors: string[] = [];

    if (!fs.existsSync(videoPath)) {
      return { isValid: false, errors: ['Video file does not exist'] };
    }

    // Get basic file info
    const stats = fs.statSync(videoPath);
    const fileSize = stats.size;
    const fileSizeMB = fileSize / (1024 * 1024);

    // Validate file size
    if (fileSizeMB > this.MAX_FILE_SIZE_MB) {
      errors.push(
        `File size ${fileSizeMB.toFixed(2)} MB exceeds Instagram limit of ${this.MAX_FILE_SIZE_MB}MB`,
      );
    }

    if (fileSize === 0) {
      errors.push('Video file is empty');
    }

    // Check file extension
    const extension = videoPath.toLowerCase().split('.').pop();
    if (!['mp4', 'mov'].includes(extension || '')) {
      errors.push(
        `Unsupported file format: .${extension}. Instagram Reels supports MP4 and MOV only`,
      );
    }

    // For MVP, basic validation is sufficient
    // TODO: Add ffprobe integration for detailed metadata validation:
    // - Duration (3-90s)
    // - Aspect ratio (9:16 recommended)
    // - Resolution (1080x1920)
    // - Codec (H.264 or HEVC)
    // - Audio codec (AAC, 48kHz)
    // - Frame rate (23-60 fps)

    this.logger.log(`Validated video for Instagram: ${videoPath} (${fileSizeMB.toFixed(2)} MB)`);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate video duration
   */
  validateDuration(duration: number): InstagramValidationResult {
    const errors: string[] = [];

    if (duration < this.MIN_DURATION_SECONDS) {
      errors.push(
        `Duration ${duration}s is below Instagram minimum of ${this.MIN_DURATION_SECONDS}s`,
      );
    }

    if (duration > this.MAX_DURATION_SECONDS) {
      errors.push(
        `Duration ${duration}s exceeds Instagram Reels limit of ${this.MAX_DURATION_SECONDS}s`,
      );
    }

    if (duration < this.RECOMMENDED_MIN_DURATION) {
      this.logger.warn(
        `Duration ${duration}s is below recommended minimum of ${this.RECOMMENDED_MIN_DURATION}s for Reels tab visibility`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate aspect ratio
   */
  validateAspectRatio(width: number, height: number): InstagramValidationResult {
    const errors: string[] = [];
    const aspectRatio = width / height;
    const diff = Math.abs(aspectRatio - this.RECOMMENDED_ASPECT_RATIO);

    if (diff > this.ASPECT_RATIO_TOLERANCE) {
      this.logger.warn(
        `Aspect ratio ${aspectRatio.toFixed(2)} (${width}x${height}) differs from recommended 9:16 (0.56)`,
      );
    }

    // Instagram allows 0.01:1 - 10:1, but 9:16 is strongly recommended
    const minRatio = 0.01;
    const maxRatio = 10;

    if (aspectRatio < minRatio || aspectRatio > maxRatio) {
      errors.push(
        `Aspect ratio ${aspectRatio.toFixed(2)} outside Instagram acceptable range (0.01:1 - 10:1)`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate resolution
   */
  validateResolution(width: number, height: number): InstagramValidationResult {
    const errors: string[] = [];

    if (width !== this.RECOMMENDED_WIDTH || height !== this.RECOMMENDED_HEIGHT) {
      this.logger.warn(
        `Resolution ${width}x${height} differs from recommended ${this.RECOMMENDED_WIDTH}x${this.RECOMMENDED_HEIGHT}`,
      );
    }

    // Instagram accepts various resolutions, but 1080x1920 is optimal
    const minWidth = 540;
    const minHeight = 960;

    if (width < minWidth || height < minHeight) {
      errors.push(`Resolution ${width}x${height} is below minimum ${minWidth}x${minHeight}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate video codec
   */
  validateCodec(videoCodec: string, audioCodec?: string): InstagramValidationResult {
    const errors: string[] = [];

    const allowedVideoCodecs = ['h264', 'hevc', 'h.264', 'h.265'];
    const allowedAudioCodecs = ['aac'];

    if (!allowedVideoCodecs.includes(videoCodec.toLowerCase())) {
      errors.push(
        `Video codec ${videoCodec} not supported. Instagram Reels requires H.264 or HEVC`,
      );
    }

    if (audioCodec && !allowedAudioCodecs.includes(audioCodec.toLowerCase())) {
      errors.push(`Audio codec ${audioCodec} not supported. Instagram Reels requires AAC`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate frame rate
   */
  validateFrameRate(fps: number): InstagramValidationResult {
    const errors: string[] = [];
    const minFps = 23;
    const maxFps = 60;

    if (fps < minFps || fps > maxFps) {
      errors.push(
        `Frame rate ${fps} fps outside Instagram recommended range (${minFps}-${maxFps} fps)`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
