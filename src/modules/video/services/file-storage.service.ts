import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import axios from 'axios';

export interface DownloadOptions {
  maxSize?: number;
  timeout?: number;
  retries?: number;
}

export interface UploadOptions {
  contentType?: string;
  public?: boolean;
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly tempDir: string;
  private readonly maxFileSize: number;

  constructor(private readonly config: ConfigService) {
    this.tempDir = this.config.get<string>('STORAGE_DIR', '/tmp/video');
    this.maxFileSize = 2 * 1024 * 1024 * 1024; // 2GB
    void void this.ensureTempDir();
  }

  /**
   * Download file from URL to local temp directory
   */
  async downloadFile(url: string, filename?: string, options?: DownloadOptions): Promise<string> {
    const opts = {
      maxSize: options?.maxSize || this.maxFileSize,
      timeout: options?.timeout || 30000,
      retries: options?.retries || 3,
    };

    this.logger.log(`Downloading file from: ${url}`);
    this.validateUrl(url);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= opts.retries; attempt++) {
      try {
        return await this.downloadWithRetry(url, filename, opts);
      } catch (err) {
        lastError = err as Error;
        this.logger.warn(`Download attempt ${attempt}/${opts.retries} failed: ${err.message}`);

        if (attempt < opts.retries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Download failed after ${opts.retries} attempts: ${lastError?.message}`);
  }

  /**
   * Upload file to storage (local or S3/CDN)
   */
  async uploadFile(
    localPath: string,
    remotePath: string,
    _options?: UploadOptions,
  ): Promise<string> {
    this.logger.log(`Uploading file: ${path.basename(localPath)}`);

    // Validate file exists
    try {
      await fs.access(localPath);
    } catch {
      throw new Error(`File not found: ${localPath}`);
    }

    // For now, implement local storage
    // In production, this would upload to S3/CDN
    const cdnBaseUrl = this.config.get<string>('CDN_BASE_URL', 'http://localhost:3000/files');
    const uploadDir = this.config.get<string>('UPLOAD_DIR', '/tmp/uploads');

    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Copy file to upload directory
    const targetPath = path.join(uploadDir, remotePath);
    const targetDir = path.dirname(targetPath);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.copyFile(localPath, targetPath);

    const cdnUrl = `${cdnBaseUrl}/${remotePath}`;
    this.logger.log(`File uploaded: ${cdnUrl}`);

    return cdnUrl;
  }

  /**
   * Cleanup temporary file
   */
  async cleanupTempFile(filepath: string): Promise<void> {
    try {
      await fs.unlink(filepath);
      this.logger.debug(`Cleaned up temp file: ${path.basename(filepath)}`);
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      // Silently ignore if file doesn't exist
      if (error.code === 'ENOENT') {
        this.logger.debug(`File already deleted or not found: ${filepath}`);
        return;
      }
      // Log other errors but don't throw
      this.logger.warn(`Failed to cleanup file ${filepath}: ${error.message || String(err)}`);
    }
  }

  /**
   * Cleanup all temporary files older than specified age
   */
  async cleanupOldFiles(maxAgeHours: number = 1): Promise<number> {
    this.logger.log(`Cleaning up files older than ${maxAgeHours} hours`);

    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    const now = Date.now();
    let deletedCount = 0;

    try {
      const files = await fs.readdir(this.tempDir);

      for (const file of files) {
        const filepath = path.join(this.tempDir, file);
        const stats = await fs.stat(filepath);

        if (now - stats.mtimeMs > maxAgeMs) {
          await this.cleanupTempFile(filepath);
          deletedCount++;
        }
      }

      this.logger.log(`Cleaned up ${deletedCount} old files`);
    } catch (err) {
      this.logger.error(`Cleanup failed: ${err.message}`);
    }

    return deletedCount;
  }

  /**
   * Validate file type and size
   */
  async validateFile(filepath: string, expectedType: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filepath);

      // Check file size
      if (stats.size > this.maxFileSize) {
        throw new Error(`File too large: ${stats.size} bytes (max: ${this.maxFileSize})`);
      }

      // Check file extension
      const ext = path.extname(filepath).toLowerCase();
      const validExtensions: Record<string, string[]> = {
        video: ['.mp4', '.mov', '.avi', '.mkv'],
        audio: ['.mp3', '.wav', '.aac', '.m4a'],
        image: ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      };

      const expectedExtensions = validExtensions[expectedType] || [];
      if (!expectedExtensions.includes(ext)) {
        throw new Error(`Invalid file type: ${ext} (expected: ${expectedExtensions.join(', ')})`);
      }

      return true;
    } catch (err) {
      this.logger.error(`File validation failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Get temporary file path with unique name
   */
  getTempPath(filename: string): string {
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    return path.join(this.tempDir, `${base}-${uniqueId}${ext}`);
  }

  /**
   * Check available disk space
   */
  async checkDiskSpace(): Promise<{ available: number; total: number }> {
    // This is a simplified version
    // In production, use a library like 'check-disk-space'
    return {
      available: 10 * 1024 * 1024 * 1024, // Mock: 10GB
      total: 50 * 1024 * 1024 * 1024, // Mock: 50GB
    };
  }

  /**
   * Private: Download with retry logic
   */
  private async downloadWithRetry(
    url: string,
    filename?: string,
    options?: DownloadOptions,
  ): Promise<string> {
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'stream',
      timeout: options?.timeout || 30000,
      maxContentLength: options?.maxSize || this.maxFileSize,
    });

    // Validate content type
    const contentType = response.headers['content-type'];
    this.logger.debug(`Content-Type: ${contentType}`);

    // Generate filename if not provided
    const outputFilename = filename || this.generateFilename(url, contentType);
    const outputPath = this.getTempPath(outputFilename);

    // Download file
    const writer = await fs.open(outputPath, 'w');
    const stream = writer.createWriteStream();

    return new Promise((resolve, reject) => {
      let downloadedSize = 0;

      response.data.on('data', (chunk: Buffer) => {
        downloadedSize += chunk.length;
        if (downloadedSize > (options?.maxSize || this.maxFileSize)) {
          stream.destroy();
          reject(new Error('File size exceeds maximum allowed'));
        }
      });

      response.data.pipe(stream);

      stream.on('finish', async () => {
        void writer.close();
        this.logger.log(`Downloaded: ${path.basename(outputPath)} (${downloadedSize} bytes)`);
        resolve(outputPath);
      });

      stream.on('error', async (_err) => {
        void writer.close();
        await this.cleanupTempFile(outputPath);
        reject(_err);
      });
    });
  }

  /**
   * Private: Validate URL
   */
  private validateUrl(url: string): void {
    try {
      const parsedUrl = new URL(url);
      const allowedProtocols = ['http:', 'https:'];

      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        throw new Error(`Invalid protocol: ${parsedUrl.protocol}`);
      }
    } catch (err) {
      throw new Error(`Invalid URL: ${err.message}`);
    }
  }

  /**
   * Private: Generate filename from URL
   */
  private generateFilename(url: string, contentType?: string): string {
    const parsedUrl = new URL(url);
    let filename = path.basename(parsedUrl.pathname);

    if (!filename || filename === '/') {
      // Generate filename from content type
      const ext = this.getExtensionFromContentType(contentType);
      filename = `download-${Date.now()}${ext}`;
    }

    return filename;
  }

  /**
   * Private: Get file extension from content type
   */
  private getExtensionFromContentType(contentType?: string): string {
    if (!contentType) return '.bin';

    const mimeMap: Record<string, string> = {
      'video/mp4': '.mp4',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'image/png': '.png',
      'image/jpeg': '.jpg',
    };

    return mimeMap[contentType] || '.bin';
  }

  /**
   * Private: Ensure temp directory exists
   */
  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      this.logger.log(`Temp directory ready: ${this.tempDir}`);
    } catch (err) {
      this.logger.error(`Failed to create temp directory: ${err.message}`);
      throw err;
    }
  }

  /**
   * Private: Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
