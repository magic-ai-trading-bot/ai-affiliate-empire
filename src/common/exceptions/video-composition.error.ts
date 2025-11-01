export class VideoCompositionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, any>,
    public readonly recoverable: boolean = false,
  ) {
    super(message);
    this.name = 'VideoCompositionError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      recoverable: this.recoverable,
      stack: this.stack,
    };
  }
}

export const VideoErrorCodes = {
  // Download errors (recoverable)
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  DOWNLOAD_TIMEOUT: 'DOWNLOAD_TIMEOUT',
  DOWNLOAD_SIZE_EXCEEDED: 'DOWNLOAD_SIZE_EXCEEDED',
  DOWNLOAD_INVALID_URL: 'DOWNLOAD_INVALID_URL',

  // Validation errors (non-recoverable)
  INVALID_SOURCE: 'INVALID_SOURCE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_CODEC: 'INVALID_CODEC',
  CORRUPTED_FILE: 'CORRUPTED_FILE',

  // Composition errors (potentially recoverable)
  COMPOSITION_FAILED: 'COMPOSITION_FAILED',
  AUDIO_SYNC_FAILED: 'AUDIO_SYNC_FAILED',
  ENCODING_FAILED: 'ENCODING_FAILED',

  // Resource errors (recoverable)
  TIMEOUT: 'TIMEOUT',
  DISK_FULL: 'DISK_FULL',
  MEMORY_EXCEEDED: 'MEMORY_EXCEEDED',

  // Output errors (potentially recoverable)
  INVALID_OUTPUT: 'INVALID_OUTPUT',
  OUTPUT_TOO_LARGE: 'OUTPUT_TOO_LARGE',

  // Upload errors (recoverable)
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  UPLOAD_TIMEOUT: 'UPLOAD_TIMEOUT',

  // FFmpeg errors (non-recoverable)
  FFMPEG_NOT_FOUND: 'FFMPEG_NOT_FOUND',
  FFMPEG_ERROR: 'FFMPEG_ERROR',

  // Thumbnail errors (recoverable)
  THUMBNAIL_FAILED: 'THUMBNAIL_FAILED',
  FRAME_EXTRACTION_FAILED: 'FRAME_EXTRACTION_FAILED',
} as const;

export type VideoErrorCode = (typeof VideoErrorCodes)[keyof typeof VideoErrorCodes];

/**
 * Factory functions for creating specific errors
 */
export class VideoErrorFactory {
  static downloadFailed(url: string, reason: string): VideoCompositionError {
    return new VideoCompositionError(
      `Failed to download file: ${reason}`,
      VideoErrorCodes.DOWNLOAD_FAILED,
      { url, reason },
      true, // recoverable
    );
  }

  static invalidSource(filepath: string, reason: string): VideoCompositionError {
    return new VideoCompositionError(
      `Invalid source file: ${reason}`,
      VideoErrorCodes.INVALID_SOURCE,
      { filepath, reason },
      false, // non-recoverable
    );
  }

  static compositionFailed(reason: string, context?: Record<string, any>): VideoCompositionError {
    return new VideoCompositionError(
      `Video composition failed: ${reason}`,
      VideoErrorCodes.COMPOSITION_FAILED,
      context,
      true, // potentially recoverable
    );
  }

  static timeout(operation: string, timeoutMs: number): VideoCompositionError {
    return new VideoCompositionError(
      `Operation timed out: ${operation}`,
      VideoErrorCodes.TIMEOUT,
      { operation, timeoutMs },
      true, // recoverable
    );
  }

  static diskFull(requiredSpace: number, availableSpace: number): VideoCompositionError {
    return new VideoCompositionError(
      `Insufficient disk space`,
      VideoErrorCodes.DISK_FULL,
      { requiredSpace, availableSpace },
      true, // recoverable
    );
  }

  static uploadFailed(filepath: string, reason: string): VideoCompositionError {
    return new VideoCompositionError(
      `Failed to upload file: ${reason}`,
      VideoErrorCodes.UPLOAD_FAILED,
      { filepath, reason },
      true, // recoverable
    );
  }

  static ffmpegNotFound(): VideoCompositionError {
    return new VideoCompositionError(
      'FFmpeg binary not found or not properly configured',
      VideoErrorCodes.FFMPEG_NOT_FOUND,
      {},
      false, // non-recoverable
    );
  }

  static thumbnailFailed(reason: string): VideoCompositionError {
    return new VideoCompositionError(
      `Thumbnail generation failed: ${reason}`,
      VideoErrorCodes.THUMBNAIL_FAILED,
      { reason },
      true, // recoverable - can use placeholder
    );
  }
}

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(error: Error | VideoCompositionError): boolean {
  if (error instanceof VideoCompositionError) {
    return error.recoverable;
  }

  // Network errors are typically recoverable
  if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
    return true;
  }

  // File system errors
  if (error.message.includes('ENOSPC')) {
    // Disk full
    return true;
  }

  // Default to non-recoverable for unknown errors
  return false;
}

/**
 * Map FFmpeg error to VideoCompositionError
 */
export function mapFFmpegError(error: Error): VideoCompositionError {
  const message = error.message.toLowerCase();

  // Check for specific FFmpeg error patterns
  if (message.includes('invalid data') || message.includes('invalid argument')) {
    return VideoErrorFactory.invalidSource('unknown', error.message);
  }

  if (message.includes('no space left')) {
    return VideoErrorFactory.diskFull(0, 0);
  }

  if (message.includes('timeout') || message.includes('timed out')) {
    return VideoErrorFactory.timeout('ffmpeg', 60000);
  }

  if (message.includes('not found') || message.includes('cannot find')) {
    return VideoErrorFactory.ffmpegNotFound();
  }

  // Default to composition failed
  return VideoErrorFactory.compositionFailed(error.message);
}
