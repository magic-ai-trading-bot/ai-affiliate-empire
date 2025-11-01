/**
 * YouTube-specific exceptions for error handling
 */

export class YoutubeAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YoutubeAuthenticationError';
  }
}

export class YoutubeQuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YoutubeQuotaExceededError';
  }
}

export class YoutubeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YoutubeValidationError';
  }
}

export class YoutubeUploadFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YoutubeUploadFailedError';
  }
}

export class YoutubeProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YoutubeProcessingError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
