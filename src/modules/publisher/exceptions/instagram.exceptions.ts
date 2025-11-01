/**
 * Instagram-specific exceptions for error handling
 */

export class InstagramAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstagramAuthenticationError';
  }
}

export class InstagramUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstagramUploadError';
  }
}

export class InstagramValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstagramValidationError';
  }
}

export class InstagramTokenExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstagramTokenExpiredError';
  }
}

export class InstagramContainerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstagramContainerError';
  }
}

export class InstagramPublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstagramPublishError';
  }
}
