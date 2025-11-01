import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface DownloadResult {
  path: string;
  size: number;
  mimeType: string;
}

export interface DownloadOptions {
  maxRetries?: number;
  timeout?: number;
}

/**
 * Service for downloading video files from URLs
 * Handles retries, timeouts, and temp file management
 */
@Injectable()
export class FileDownloaderService {
  private readonly logger = new Logger(FileDownloaderService.name);
  private readonly httpClient: AxiosInstance;
  private readonly tempDir: string;

  constructor() {
    this.httpClient = axios.create({
      timeout: 300000, // 5 minutes
      maxRedirects: 3,
    });

    // Create temp directory for downloads
    this.tempDir = path.join(process.cwd(), 'tmp', 'downloads');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Download video from URL with retry logic
   */
  async downloadVideo(videoUrl: string, options: DownloadOptions = {}): Promise<DownloadResult> {
    const { maxRetries = 3, timeout = 300000 } = options;

    this.validateUrl(videoUrl);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        this.logger.log(`Downloading video (attempt ${attempt + 1}/${maxRetries}): ${videoUrl}`);

        const response = await this.httpClient.get(videoUrl, {
          responseType: 'stream',
          timeout,
        });

        const mimeType = response.headers['content-type'] || 'video/mp4';

        // Validate content type
        if (!mimeType.startsWith('video/')) {
          throw new Error(`Invalid content type: ${mimeType}. Expected video/*`);
        }

        // Generate unique filename
        const hash = crypto.createHash('md5').update(videoUrl).digest('hex');
        const extension = this.getExtensionFromMimeType(mimeType);
        const filename = `${Date.now()}_${hash}.${extension}`;
        const filePath = path.join(this.tempDir, filename);

        // Stream to file
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
          writer.on('finish', () => resolve());
          writer.on('error', reject);
        });

        // Get actual file size
        const stats = fs.statSync(filePath);

        this.logger.log(
          `Downloaded video: ${filePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`,
        );

        return {
          path: filePath,
          size: stats.size,
          mimeType,
        };
      } catch {
        lastError = error;
        this.logger.warn(`Download attempt ${attempt + 1} failed: ${error.message}`);

        if (attempt < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to download video after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Validate URL format and protocol
   */
  private validateUrl(url: string): void {
    if (!url) {
      throw new Error('URL is required');
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('URL must use HTTP or HTTPS protocol');
    }

    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/x-msvideo': 'avi',
      'video/webm': 'webm',
    };

    return mimeMap[mimeType] || 'mp4';
  }

  /**
   * Cleanup downloaded file
   */
  async cleanupFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Cleaned up temp file: ${filePath}`);
      }
    } catch {
      this.logger.warn(`Failed to cleanup file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Cleanup old temp files (older than 24 hours)
   */
  async cleanupOldFiles(): Promise<void> {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(filePath);
          this.logger.log(`Deleted old temp file: ${filePath}`);
        }
      }
    } catch {
      this.logger.warn(`Failed to cleanup old files: ${error.message}`);
    }
  }
}
