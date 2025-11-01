import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  aspectRatio: number;
  codec: string;
  audioCodec?: string;
  frameRate: number;
  fileSize: number;
}

export type Platform = 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM';

/**
 * Service for validating video specifications per platform
 * Uses basic file checks (ffprobe integration can be added later)
 */
@Injectable()
export class VideoValidatorService {
  private readonly logger = new Logger(VideoValidatorService.name);

  /**
   * Validate video for specific platform
   */
  async validateForPlatform(videoPath: string, platform: Platform): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!fs.existsSync(videoPath)) {
      return { isValid: false, errors: ['Video file does not exist'] };
    }

    // Get basic file info
    const stats = fs.statSync(videoPath);
    const fileSize = stats.size;

    // Validate file size
    const sizeValidation = this.validateFileSize(fileSize, platform);
    if (!sizeValidation.isValid) {
      errors.push(...sizeValidation.errors);
    }

    // For MVP, we'll accept the video if file size is valid
    // TODO: Add ffprobe integration for detailed metadata extraction
    // For now, assume videos are properly formatted

    this.logger.log(
      `Validated video for ${platform}: ${videoPath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`,
    );

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate file size for platform
   */
  private validateFileSize(fileSize: number, platform: Platform): ValidationResult {
    const errors: string[] = [];
    const sizeMB = fileSize / (1024 * 1024);

    switch (platform) {
      case 'YOUTUBE':
        // YouTube allows up to 256GB, but we'll set a reasonable limit
        if (sizeMB > 2048) {
          // 2GB
          errors.push(`File size ${sizeMB.toFixed(2)} MB exceeds YouTube limit of 2GB`);
        }
        break;

      case 'TIKTOK':
        // TikTok: 5MB - 128MB
        if (sizeMB < 5) {
          errors.push(`File size ${sizeMB.toFixed(2)} MB below TikTok minimum of 5MB`);
        }
        if (sizeMB > 128) {
          errors.push(`File size ${sizeMB.toFixed(2)} MB exceeds TikTok limit of 128MB`);
        }
        break;

      case 'INSTAGRAM':
        // Instagram: Recommend < 5GB
        if (sizeMB > 5120) {
          // 5GB
          errors.push(`File size ${sizeMB.toFixed(2)} MB exceeds Instagram limit of 5GB`);
        }
        break;
    }

    if (fileSize === 0) {
      errors.push('Video file is empty');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract video metadata (placeholder for ffprobe integration)
   * TODO: Implement with ffprobe for production
   */
  async extractMetadata(videoPath: string): Promise<VideoMetadata | null> {
    try {
      const stats = fs.statSync(videoPath);

      // Placeholder metadata - in production, use ffprobe
      return {
        width: 1080,
        height: 1920,
        duration: 60,
        aspectRatio: 9 / 16,
        codec: 'h264',
        audioCodec: 'aac',
        frameRate: 30,
        fileSize: stats.size,
      };
    } catch (error: any) {
      this.logger.error(`Failed to extract metadata: ${error.message}`);
      return null;
    }
  }

  /**
   * Validate aspect ratio
   */
  private validateAspectRatio(aspectRatio: number, _platform: Platform): ValidationResult {
    const errors: string[] = [];
    const targetRatio = 9 / 16; // Vertical video
    const tolerance = 0.05;

    const diff = Math.abs(aspectRatio - targetRatio);

    if (diff > tolerance) {
      errors.push(
        `Aspect ratio ${aspectRatio.toFixed(2)} not suitable for vertical video (expected ${targetRatio.toFixed(2)})`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate duration
   */
  private validateDuration(duration: number, platform: Platform): ValidationResult {
    const errors: string[] = [];

    switch (platform) {
      case 'YOUTUBE':
        // YouTube Shorts: <= 60 seconds
        if (duration > 60) {
          errors.push(`Duration ${duration}s exceeds YouTube Shorts limit of 60s`);
        }
        break;

      case 'TIKTOK':
        // TikTok: 3 seconds - 10 minutes
        if (duration < 3) {
          errors.push(`Duration ${duration}s below TikTok minimum of 3s`);
        }
        if (duration > 600) {
          errors.push(`Duration ${duration}s exceeds TikTok limit of 10 minutes`);
        }
        break;

      case 'INSTAGRAM':
        // Instagram Reels: 5-90 seconds for Reels tab
        if (duration < 5) {
          errors.push(`Duration ${duration}s below Instagram Reels minimum of 5s`);
        }
        if (duration > 90) {
          errors.push(`Duration ${duration}s exceeds Instagram Reels recommended limit of 90s`);
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
