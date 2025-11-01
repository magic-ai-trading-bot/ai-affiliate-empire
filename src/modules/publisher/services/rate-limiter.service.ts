import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

export interface RateLimitConfig {
  tokens: number;
  window: 'day' | 'hour' | 'minute';
  perMinute?: number;
}

interface TokenBucket {
  tokens: number;
  maxTokens: number;
  lastReset: Date;
  window: 'day' | 'hour' | 'minute';
  perMinuteTokens?: number;
  perMinuteMax?: number;
  lastMinuteReset?: Date;
}

/**
 * Rate limiter service using token bucket algorithm
 * Supports per-platform rate limiting with daily quotas
 */
@Injectable()
export class RateLimiterService implements OnModuleInit {
  private readonly logger = new Logger(RateLimiterService.name);
  private buckets: Map<string, TokenBucket> = new Map();

  // Platform-specific rate limits
  private readonly RATE_LIMITS: Record<string, RateLimitConfig> = {
    YOUTUBE: { tokens: 6, window: 'day', perMinute: undefined },
    TIKTOK: { tokens: 30, window: 'day', perMinute: 6 },
    INSTAGRAM: { tokens: 10, window: 'day', perMinute: undefined },
  };

  async onModuleInit() {
    this.initializePlatformLimits();
    this.startDailyReset();
  }

  /**
   * Initialize token buckets for all platforms
   */
  private initializePlatformLimits(): void {
    for (const [platform, config] of Object.entries(this.RATE_LIMITS)) {
      this.buckets.set(platform, {
        tokens: config.tokens,
        maxTokens: config.tokens,
        lastReset: new Date(),
        window: config.window,
        perMinuteTokens: config.perMinute,
        perMinuteMax: config.perMinute,
        lastMinuteReset: config.perMinute ? new Date() : undefined,
      });

      this.logger.log(
        `Initialized rate limit for ${platform}: ${config.tokens} tokens per ${config.window}`,
      );
    }
  }

  /**
   * Check if platform has available tokens
   */
  async checkLimit(platform: string): Promise<boolean> {
    const bucket = this.getBucket(platform);
    if (!bucket) {
      this.logger.warn(`No rate limit configured for platform: ${platform}`);
      return true;
    }

    // Reset bucket if window has passed
    this.resetBucketIfNeeded(platform, bucket);

    // Check daily limit
    if (bucket.tokens <= 0) {
      this.logger.warn(`Rate limit exceeded for ${platform}: 0 tokens remaining`);
      return false;
    }

    // Check per-minute limit if configured
    if (bucket.perMinuteTokens !== undefined && bucket.perMinuteMax !== undefined) {
      this.resetPerMinuteBucketIfNeeded(bucket);
      if (bucket.perMinuteTokens <= 0) {
        this.logger.warn(`Per-minute rate limit exceeded for ${platform}: 0 tokens remaining`);
        return false;
      }
    }

    return true;
  }

  /**
   * Consume a token from the bucket
   */
  async consumeToken(platform: string): Promise<void> {
    const bucket = this.getBucket(platform);
    if (!bucket) {
      return;
    }

    // Reset bucket if needed
    this.resetBucketIfNeeded(platform, bucket);

    // Consume daily token
    if (bucket.tokens > 0) {
      bucket.tokens--;
      this.logger.log(
        `Consumed token for ${platform}: ${bucket.tokens}/${bucket.maxTokens} remaining`,
      );
    }

    // Consume per-minute token if configured
    if (bucket.perMinuteTokens !== undefined) {
      this.resetPerMinuteBucketIfNeeded(bucket);
      if (bucket.perMinuteTokens > 0) {
        bucket.perMinuteTokens--;
      }
    }
  }

  /**
   * Get remaining tokens for platform
   */
  async getRemainingTokens(platform: string): Promise<number> {
    const bucket = this.getBucket(platform);
    if (!bucket) {
      return 0;
    }

    this.resetBucketIfNeeded(platform, bucket);
    return bucket.tokens;
  }

  /**
   * Reset bucket if window has passed
   */
  private resetBucketIfNeeded(platform: string, bucket: TokenBucket): void {
    const now = new Date();
    const timeSinceReset = now.getTime() - bucket.lastReset.getTime();

    let shouldReset = false;

    switch (bucket.window) {
      case 'day':
        shouldReset = timeSinceReset >= 24 * 60 * 60 * 1000;
        break;
      case 'hour':
        shouldReset = timeSinceReset >= 60 * 60 * 1000;
        break;
      case 'minute':
        shouldReset = timeSinceReset >= 60 * 1000;
        break;
    }

    if (shouldReset) {
      bucket.tokens = bucket.maxTokens;
      bucket.lastReset = now;
      this.logger.log(`Reset rate limit for ${platform}: ${bucket.maxTokens} tokens`);
    }
  }

  /**
   * Reset per-minute bucket if needed
   */
  private resetPerMinuteBucketIfNeeded(bucket: TokenBucket): void {
    if (!bucket.lastMinuteReset || bucket.perMinuteMax === undefined) {
      return;
    }

    const now = new Date();
    const timeSinceReset = now.getTime() - bucket.lastMinuteReset.getTime();

    if (timeSinceReset >= 60 * 1000) {
      bucket.perMinuteTokens = bucket.perMinuteMax;
      bucket.lastMinuteReset = now;
    }
  }

  /**
   * Start daily reset interval
   */
  private startDailyReset(): void {
    // Reset all daily buckets at midnight
    setInterval(
      () => {
        for (const [platform, bucket] of this.buckets.entries()) {
          if (bucket.window === 'day') {
            this.resetBucketIfNeeded(platform, bucket);
          }
        }
      },
      60 * 60 * 1000,
    ); // Check every hour
  }

  /**
   * Get bucket for platform
   */
  private getBucket(platform: string): TokenBucket | undefined {
    return this.buckets.get(platform);
  }

  /**
   * Manually reset all buckets (for testing)
   */
  async resetDaily(): Promise<void> {
    for (const [platform, bucket] of this.buckets.entries()) {
      bucket.tokens = bucket.maxTokens;
      bucket.lastReset = new Date();
      if (bucket.perMinuteMax !== undefined) {
        bucket.perMinuteTokens = bucket.perMinuteMax;
        bucket.lastMinuteReset = new Date();
      }
      this.logger.log(`Manually reset rate limit for ${platform}`);
    }
  }
}
