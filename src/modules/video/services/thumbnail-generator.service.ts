import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FFmpegService, TextOverlayOptions } from './ffmpeg.service';
import { FileStorageService } from './file-storage.service';

export interface ThumbnailOptions {
  productTitle: string;
  resolution?: { width: number; height: number };
  backgroundColor?: string;
  textColor?: string;
  fontSizePt?: number;
  timestamp?: number;
  addText?: boolean;
}

@Injectable()
export class ThumbnailGeneratorService {
  private readonly logger = new Logger(ThumbnailGeneratorService.name);
  private readonly defaultResolution = { width: 1024, height: 1024 };
  private readonly placeholderUrl =
    'https://via.placeholder.com/1024x1024.png?text=Video+Thumbnail';

  constructor(
    private readonly ffmpeg: FFmpegService,
    private readonly fileStorage: FileStorageService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generate thumbnail from video frame
   */
  async generateFromVideo(videoPath: string, options: ThumbnailOptions): Promise<string> {
    const {
      productTitle,
      resolution = this.defaultResolution,
      timestamp,
      addText = true,
      textColor = 'white',
      fontSizePt = 48,
    } = options;

    this.logger.log(`Generating thumbnail for: ${productTitle}`);

    try {
      // Step 1: Extract frame from video
      const framePath = this.fileStorage.getTempPath('frame.png');
      await this.ffmpeg.extractFrame(videoPath, framePath, timestamp);

      // Step 2: Scale to target resolution
      const scaledPath = this.fileStorage.getTempPath('scaled.png');
      await this.ffmpeg.scaleVideo(framePath, scaledPath, resolution.width, resolution.height);

      // Step 3: Add text overlay if requested
      let thumbnailPath = scaledPath;
      if (addText) {
        const overlayPath = this.fileStorage.getTempPath('thumbnail.png');
        const textOptions: TextOverlayOptions = {
          text: this.formatThumbnailText(productTitle),
          fontSize: fontSizePt,
          fontColor: textColor,
          position: 'center',
          backgroundColor: 'black@0.7',
        };

        await this.ffmpeg.addTextOverlay(scaledPath, overlayPath, textOptions);
        thumbnailPath = overlayPath;

        // Cleanup intermediate file
        await this.fileStorage.cleanupTempFile(scaledPath);
      }

      // Step 4: Upload to storage
      const remotePath = `thumbnails/${this.sanitizeFilename(productTitle)}.png`;
      const cdnUrl = await this.fileStorage.uploadFile(thumbnailPath, remotePath, {
        contentType: 'image/png',
      });

      // Step 5: Cleanup temp files
      await this.fileStorage.cleanupTempFile(framePath);
      await this.fileStorage.cleanupTempFile(thumbnailPath);

      this.logger.log(`Thumbnail generated: ${cdnUrl}`);
      return cdnUrl;
    } catch (err) {
      this.logger.error(`Thumbnail generation failed: ${err.message}`);

      // Fallback to placeholder
      const usePlaceholder = this.config.get<boolean>('THUMBNAIL_USE_PLACEHOLDER', true);
      if (usePlaceholder) {
        this.logger.warn('Using placeholder thumbnail');
        return this.placeholderUrl;
      }

      throw err;
    }
  }

  /**
   * Generate thumbnail with custom text (no video required)
   */
  async generateWithText(
    text: string,
    options?: {
      resolution?: { width: number; height: number };
      backgroundColor?: string;
      textColor?: string;
      fontSizePt?: number;
    },
  ): Promise<string> {
    const {
      resolution = this.defaultResolution,
      backgroundColor = '#1a1a1a',
      textColor = 'white',
      fontSizePt = 64,
    } = options || {};

    this.logger.log(`Generating text thumbnail: ${text}`);

    try {
      // Create a blank canvas using FFmpeg
      const blankPath = this.fileStorage.getTempPath('blank.png');
      const thumbnailPath = this.fileStorage.getTempPath('thumbnail.png');

      // Generate blank image with FFmpeg
      await this.generateBlankImage(blankPath, resolution, backgroundColor);

      // Add text overlay
      const textOptions: TextOverlayOptions = {
        text: this.formatThumbnailText(text),
        fontSize: fontSizePt,
        fontColor: textColor,
        position: 'center',
        backgroundColor: 'transparent',
      };

      await this.ffmpeg.addTextOverlay(blankPath, thumbnailPath, textOptions);

      // Upload to storage
      const remotePath = `thumbnails/${this.sanitizeFilename(text)}.png`;
      const cdnUrl = await this.fileStorage.uploadFile(thumbnailPath, remotePath, {
        contentType: 'image/png',
      });

      // Cleanup
      await this.fileStorage.cleanupTempFile(blankPath);
      await this.fileStorage.cleanupTempFile(thumbnailPath);

      this.logger.log(`Text thumbnail generated: ${cdnUrl}`);
      return cdnUrl;
    } catch (err) {
      this.logger.error(`Text thumbnail generation failed: ${err.message}`);
      return this.placeholderUrl;
    }
  }

  /**
   * Generate multiple thumbnails from different timestamps
   */
  async generateMultiple(
    videoPath: string,
    productTitle: string,
    timestamps: number[],
  ): Promise<string[]> {
    this.logger.log(`Generating ${timestamps.length} thumbnails`);

    const thumbnails: string[] = [];

    for (const timestamp of timestamps) {
      try {
        const thumbnail = await this.generateFromVideo(videoPath, {
          productTitle,
          timestamp,
        });
        thumbnails.push(thumbnail);
      } catch (err) {
        this.logger.error(`Failed to generate thumbnail at ${timestamp}s: ${err.message}`);
        thumbnails.push(this.placeholderUrl);
      }
    }

    return thumbnails;
  }

  /**
   * Validate thumbnail was generated successfully
   */
  async validateThumbnail(thumbnailPath: string): Promise<boolean> {
    try {
      // Check if file exists and is valid image
      await this.fileStorage.validateFile(thumbnailPath, 'image');

      // Get video info to verify dimensions
      const metadata = await this.ffmpeg.getVideoInfo(thumbnailPath);

      // Validate minimum dimensions
      if (metadata.width < 512 || metadata.height < 512) {
        this.logger.warn('Thumbnail dimensions too small');
        return false;
      }

      return true;
    } catch (err) {
      this.logger.error(`Thumbnail validation failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Format text for thumbnail (add line breaks if too long)
   */
  private formatThumbnailText(text: string): string {
    const maxLineLength = 40;

    if (text.length <= maxLineLength) {
      return text;
    }

    // Split into words and create lines
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxLineLength) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    // Limit to 3 lines
    const displayLines = lines.slice(0, 3);
    if (lines.length > 3) {
      displayLines[2] = displayLines[2].substring(0, maxLineLength - 3) + '...';
    }

    return displayLines.join('\n');
  }

  /**
   * Sanitize filename for safe storage
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }

  /**
   * Generate blank image with FFmpeg
   */
  private async generateBlankImage(
    outputPath: string,
    resolution: { width: number; height: number },
    color: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Convert hex color to RGB
      const rgb = this.hexToRgb(color);
      const colorString = `${rgb.r}/${rgb.g}/${rgb.b}`;

      // Use FFmpeg to generate a blank image
      // This is a workaround - ideally use a library like sharp
      // const tempVideoPath = this.fileStorage.getTempPath("blank.mp4");

      const ffmpegCommand = require('fluent-ffmpeg'); // eslint-disable-line @typescript-eslint/no-require-imports
      ffmpegCommand()
        .input(`color=c=${colorString}:s=${resolution.width}x${resolution.height}:d=1`)
        .inputOptions(['-f lavfi'])
        .frames(1)
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }
}
