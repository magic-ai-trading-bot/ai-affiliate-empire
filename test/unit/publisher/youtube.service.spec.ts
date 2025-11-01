/**
 * Unit tests for YoutubeService with YouTube Data API v3
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { YoutubeService } from '@/modules/publisher/services/youtube.service';
import { FileDownloaderService } from '@/modules/publisher/services/file-downloader.service';
import { VideoValidatorService } from '@/modules/publisher/services/video-validator.service';
import { RateLimiterService } from '@/modules/publisher/services/rate-limiter.service';
import { SecretsManagerService } from '@/common/secrets/secrets-manager.service';
import {
  YoutubeAuthenticationError,
  RateLimitError,
  ValidationError,
} from '@/modules/publisher/exceptions/youtube.exceptions';

describe('YoutubeService', () => {
  let service: YoutubeService;
  let configService: jest.Mocked<ConfigService>;
  let secretsManager: jest.Mocked<SecretsManagerService>;
  let downloader: jest.Mocked<FileDownloaderService>;
  let validator: jest.Mocked<VideoValidatorService>;
  let rateLimiter: jest.Mocked<RateLimiterService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          YOUTUBE_CLIENT_ID: 'test-client-id',
          YOUTUBE_CLIENT_SECRET: 'test-client-secret',
          YOUTUBE_REDIRECT_URI: 'http://localhost:3000/auth/youtube/callback',
        };
        return config[key];
      }),
    };

    const mockSecretsManager = {
      getSecrets: jest.fn().mockResolvedValue({}),
      getSecret: jest.fn().mockResolvedValue(null),
    };

    const mockDownloader = {
      downloadVideo: jest.fn().mockResolvedValue({
        path: '/tmp/test-video.mp4',
        size: 10 * 1024 * 1024, // 10MB
        mimeType: 'video/mp4',
      }),
      cleanupFile: jest.fn().mockResolvedValue(undefined),
    };

    const mockValidator = {
      validateForPlatform: jest.fn().mockResolvedValue({
        isValid: true,
        errors: [],
      }),
    };

    const mockRateLimiter = {
      checkLimit: jest.fn().mockResolvedValue(true),
      consumeToken: jest.fn().mockResolvedValue(undefined),
      getRemainingTokens: jest.fn().mockResolvedValue(5),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YoutubeService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SecretsManagerService, useValue: mockSecretsManager },
        { provide: FileDownloaderService, useValue: mockDownloader },
        { provide: VideoValidatorService, useValue: mockValidator },
        { provide: RateLimiterService, useValue: mockRateLimiter },
      ],
    }).compile();

    service = module.get<YoutubeService>(YoutubeService);
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    secretsManager = module.get(SecretsManagerService) as jest.Mocked<SecretsManagerService>;
    downloader = module.get(FileDownloaderService) as jest.Mocked<FileDownloaderService>;
    validator = module.get(VideoValidatorService) as jest.Mocked<VideoValidatorService>;
    rateLimiter = module.get(RateLimiterService) as jest.Mocked<RateLimiterService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should load OAuth2 configuration', () => {
      const config = (service as any).getOAuth2Config();
      expect(config.clientId).toBe('test-client-id');
      expect(config.clientSecret).toBe('test-client-secret');
      expect(config.scopes).toContain('https://www.googleapis.com/auth/youtube.upload');
    });

    it('should initialize on module init', async () => {
      await service.onModuleInit();
      expect(secretsManager.getSecrets).toHaveBeenCalled();
    });
  });

  describe('uploadShort', () => {
    it('should fail if not authenticated', async () => {
      // Mock no tokens available
      (service as any).tokens = null;

      await expect(
        service.uploadShort({
          videoUrl: 'https://example.com/video.mp4',
          title: 'Test Video',
          description: 'Test Description',
        }),
      ).rejects.toThrow(YoutubeAuthenticationError);
    });

    it('should fail if rate limit exceeded', async () => {
      // Mock authenticated state
      (service as any).tokens = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: new Date(Date.now() + 3600000),
      };

      // Mock rate limit exceeded
      rateLimiter.checkLimit.mockResolvedValue(false);

      await expect(
        service.uploadShort({
          videoUrl: 'https://example.com/video.mp4',
          title: 'Test Video',
          description: 'Test Description',
        }),
      ).rejects.toThrow(RateLimitError);
    });

    it('should fail if video validation fails', async () => {
      // Mock authenticated state
      (service as any).tokens = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: new Date(Date.now() + 3600000),
      };

      // Mock validation failure
      validator.validateForPlatform.mockResolvedValue({
        isValid: false,
        errors: ['Video duration exceeds 60 seconds'],
      });

      await expect(
        service.uploadShort({
          videoUrl: 'https://example.com/video.mp4',
          title: 'Test Video',
          description: 'Test Description',
        }),
      ).rejects.toThrow(ValidationError);

      // Verify cleanup was called
      expect(downloader.cleanupFile).toHaveBeenCalledWith('/tmp/test-video.mp4');
    });

    it('should download and validate video', async () => {
      // Mock authenticated state
      (service as any).tokens = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: new Date(Date.now() + 3600000),
      };
      (service as any).youtube = {}; // Mock YouTube client

      // Since actual upload will fail without real YouTube API, we expect an error
      await expect(
        service.uploadShort({
          videoUrl: 'https://example.com/video.mp4',
          title: 'Test Video',
          description: 'Test Description',
        }),
      ).rejects.toThrow();

      // Verify download and validation were called
      expect(downloader.downloadVideo).toHaveBeenCalledWith('https://example.com/video.mp4');
      expect(validator.validateForPlatform).toHaveBeenCalledWith('/tmp/test-video.mp4', 'YOUTUBE');
    });
  });

  describe('getVideoStats', () => {
    it('should return zero stats if not authenticated', async () => {
      (service as any).youtube = null;

      const stats = await service.getVideoStats('test-video-id');

      expect(stats).toEqual({
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      });
    });
  });

  describe('isConfigured', () => {
    it('should return false if no tokens', () => {
      (service as any).tokens = null;
      expect(service.isConfigured()).toBe(false);
    });

    it('should return true if authenticated', () => {
      (service as any).tokens = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: new Date(Date.now() + 3600000),
      };
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false if token expired', () => {
      (service as any).tokens = {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: new Date(Date.now() - 1000), // Expired
      };
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('OAuth2 flow', () => {
    it('should generate auth URL', () => {
      const authUrl = service.generateAuthUrl('test-state');
      expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(authUrl).toContain('client_id=test-client-id');
      expect(authUrl).toContain('state=test-state');
      expect(authUrl).toContain('scope=');
    });

    it('should generate auth URL without state', () => {
      const authUrl = service.generateAuthUrl();
      expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(authUrl).toContain('client_id=test-client-id');
      expect(authUrl).not.toContain('state=');
    });
  });

  describe('token management', () => {
    it('should save tokens in memory', async () => {
      const tokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: new Date(),
      };

      // Should not throw
      await expect((service as any).saveTokens(tokens)).resolves.not.toThrow();
    });

    it('should load tokens from secrets manager', async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      secretsManager.getSecrets.mockResolvedValue({
        'youtube-access-token': 'loaded-access-token',
        'youtube-refresh-token': 'loaded-refresh-token',
        'youtube-token-expires-at': expiresAt.toISOString(),
      });

      await (service as any).loadTokens();

      expect((service as any).tokens).toEqual({
        accessToken: 'loaded-access-token',
        refreshToken: 'loaded-refresh-token',
        expiresAt,
      });
    });

    it('should handle missing tokens gracefully', async () => {
      secretsManager.getSecrets.mockResolvedValue({});

      await (service as any).loadTokens();

      expect((service as any).tokens).toBeNull();
    });
  });
});
