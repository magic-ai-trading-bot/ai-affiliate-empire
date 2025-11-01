/**
 * TikTok-specific exceptions for error handling
 */

export class TiktokAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TiktokAuthenticationError';
  }
}

export class TiktokRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TiktokRateLimitError';
  }
}

export class TiktokUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TiktokUploadError';
  }
}

export class TiktokValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TiktokValidationError';
  }
}

export class TiktokChunkUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TiktokChunkUploadError';
  }
}
