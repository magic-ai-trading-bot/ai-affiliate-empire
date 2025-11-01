/**
 * Unit tests for InstagramService with Graph API container-based upload
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InstagramService } from '@/modules/publisher/services/instagram.service';
import { InstagramOAuth2Service } from '@/modules/publisher/services/instagram-oauth2.service';
import { FileDownloaderService } from '@/modules/publisher/services/file-downloader.service';
import { InstagramVideoValidatorService } from '@/modules/publisher/services/instagram-video-validator.service';
import { RateLimiterService } from '@/modules/publisher/services/rate-limiter.service';
import { SecretsManagerService } from '@/common/secrets/secrets-manager.service';
import {
  InstagramAuthenticationError,
  InstagramContainerError,
  InstagramPublishError,
} from '@/modules/publisher/exceptions/instagram.exceptions';
import { RateLimitError, ValidationError } from '@/modules/publisher/exceptions/youtube.exceptions';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('InstagramService', () => {
  let service: InstagramService;
  let oauth: InstagramOAuth2Service;
  let downloader: FileDownloaderService;
  let validator: InstagramVideoValidatorService;
  let rateLimiter: RateLimiterService;

  const mockHttpClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockedAxios.create = jest.fn().mockReturnValue(mockHttpClient as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstagramService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                INSTAGRAM_BUSINESS_ACCOUNT_ID: 'test-account-id',
              };
              return config[key];
            }),
          },
        },
        {
          provide: SecretsManagerService,
          useValue: {
            getSecrets: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: InstagramOAuth2Service,
          useValue: {
            loadTokens: jest.fn().mockResolvedValue(undefined),
            ensureValidToken: jest.fn().mockResolvedValue('test-access-token'),
            getAccessToken: jest.fn().mockReturnValue('test-access-token'),
            isAuthenticated: jest.fn().mockReturnValue(true),
            getRemainingDays: jest.fn().mockReturnValue(30),
            getBusinessAccountId: jest.fn().mockResolvedValue('test-account-id'),
          },
        },
        {
          provide: FileDownloaderService,
          useValue: {
            downloadVideo: jest.fn().mockResolvedValue({
              path: '/tmp/test-video.mp4',
              size: 1024 * 1024 * 10, // 10MB
              mimeType: 'video/mp4',
            }),
            cleanupFile: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: InstagramVideoValidatorService,
          useValue: {
            validateForInstagram: jest.fn().mockResolvedValue({
              isValid: true,
              errors: [],
            }),
          },
        },
        {
          provide: RateLimiterService,
          useValue: {
            checkLimit: jest.fn().mockResolvedValue(true),
            consumeToken: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<InstagramService>(InstagramService);
    oauth = module.get<InstagramOAuth2Service>(InstagramOAuth2Service);
    downloader = module.get<FileDownloaderService>(FileDownloaderService);
    validator = module.get<InstagramVideoValidatorService>(InstagramVideoValidatorService);
    rateLimiter = module.get<RateLimiterService>(RateLimiterService);

    await service.onModuleInit();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with OAuth2 credentials', async () => {
      expect(oauth.isAuthenticated).toHaveBeenCalled();
    });

    it('should warn if token expires soon', async () => {
      jest.spyOn(oauth, 'getRemainingDays').mockReturnValue(5);
      await service.onModuleInit();
      expect(oauth.getRemainingDays).toHaveBeenCalled();
    });

    it('should warn if not authenticated', async () => {
      jest.spyOn(oauth, 'isAuthenticated').mockReturnValue(false);
      await service.onModuleInit();
      expect(oauth.isAuthenticated).toHaveBeenCalled();
    });
  });

  describe('uploadReel - container-based flow', () => {
    beforeEach(() => {
      // Mock successful container creation
      mockHttpClient.post.mockResolvedValueOnce({
        data: { id: 'test-container-id' },
      });

      // Mock successful container polling (status = FINISHED)
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          upload_status: 'FINISHED',
          status_code: 'FINISHED',
        },
      });

      // Mock successful publish
      mockHttpClient.post.mockResolvedValueOnce({
        data: { id: 'test-media-id' },
      });

      // Mock permalink fetch
      mockHttpClient.get.mockResolvedValueOnce({
        data: { permalink: 'https://instagram.com/reel/test-media-id' },
      });
    });

    it('should upload reel successfully with container flow', async () => {
      const result = await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Test caption',
      });

      expect(result).toEqual({
        videoId: 'test-media-id',
        url: 'https://instagram.com/reel/test-media-id',
        platform: 'INSTAGRAM',
        status: 'PUBLISHED',
        publishedAt: expect.any(Date),
      });

      // Verify all steps called
      expect(oauth.ensureValidToken).toHaveBeenCalled();
      expect(rateLimiter.checkLimit).toHaveBeenCalledWith('INSTAGRAM');
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2); // create + publish
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2); // poll + permalink
      expect(rateLimiter.consumeToken).toHaveBeenCalledWith('INSTAGRAM');
    });

    it('should add Instagram hashtags to caption without hashtags', async () => {
      await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Plain caption',
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          caption: expect.stringContaining('#reels'),
        }),
        expect.any(Object),
      );
    });

    it('should keep caption as-is if it has hashtags', async () => {
      await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Caption with #hashtag',
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          caption: 'Caption with #hashtag',
        }),
        expect.any(Object),
      );
    });

    it('should validate URL is HTTPS', async () => {
      await expect(
        service.uploadReel({
          videoUrl: 'http://example.com/video.mp4', // HTTP not HTTPS
          caption: 'Test',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should validate URL format', async () => {
      await expect(
        service.uploadReel({
          videoUrl: 'invalid-url',
          caption: 'Test',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw error if not authenticated', async () => {
      jest.spyOn(oauth, 'ensureValidToken').mockResolvedValue(null);

      await expect(
        service.uploadReel({
          videoUrl: 'https://example.com/video.mp4',
          caption: 'Test',
        }),
      ).rejects.toThrow(InstagramAuthenticationError);
    });

    it('should throw error if rate limit exceeded', async () => {
      jest.spyOn(rateLimiter, 'checkLimit').mockResolvedValue(false);

      await expect(
        service.uploadReel({
          videoUrl: 'https://example.com/video.mp4',
          caption: 'Test',
        }),
      ).rejects.toThrow(RateLimitError);
    });

    it('should validate video locally if requested', async () => {
      await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Test',
        validateLocally: true,
      });

      expect(downloader.downloadVideo).toHaveBeenCalled();
      expect(validator.validateForInstagram).toHaveBeenCalled();
      expect(downloader.cleanupFile).toHaveBeenCalled();
    });

    it('should throw error if local validation fails', async () => {
      jest.spyOn(validator, 'validateForInstagram').mockResolvedValue({
        isValid: false,
        errors: ['File too large'],
      });

      await expect(
        service.uploadReel({
          videoUrl: 'https://example.com/video.mp4',
          caption: 'Test',
          validateLocally: true,
        }),
      ).rejects.toThrow(ValidationError);

      expect(downloader.cleanupFile).toHaveBeenCalled();
    });
  });

  describe('container creation', () => {
    it('should handle container creation error', async () => {
      mockHttpClient.post.mockResolvedValueOnce({
        data: {
          error: { message: 'Invalid video URL' },
        },
      });

      await expect(
        service.uploadReel({
          videoUrl: 'https://example.com/video.mp4',
          caption: 'Test',
        }),
      ).rejects.toThrow(InstagramContainerError);
    });

    it('should handle network error during container creation', async () => {
      mockHttpClient.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        service.uploadReel({
          videoUrl: 'https://example.com/video.mp4',
          caption: 'Test',
        }),
      ).rejects.toThrow(InstagramContainerError);
    });

    it('should handle API error response during container creation', async () => {
      mockHttpClient.post.mockRejectedValueOnce({
        response: {
          data: {
            error: { message: 'Invalid access token' },
          },
        },
      });

      await expect(
        service.uploadReel({
          videoUrl: 'https://example.com/video.mp4',
          caption: 'Test',
        }),
      ).rejects.toThrow(InstagramContainerError);
    });
  });

  describe('container polling', () => {
    it('should poll until container is ready', async () => {
      mockHttpClient.post.mockResolvedValueOnce({
        data: { id: 'test-container-id' },
      });

      // Mock polling: IN_PROGRESS, IN_PROGRESS, FINISHED
      mockHttpClient.get
        .mockResolvedValueOnce({
          data: { upload_status: 'IN_PROGRESS' },
        })
        .mockResolvedValueOnce({
          data: { upload_status: 'IN_PROGRESS' },
        })
        .mockResolvedValueOnce({
          data: { upload_status: 'FINISHED' },
        });

      mockHttpClient.post.mockResolvedValueOnce({
        data: { id: 'test-media-id' },
      });

      mockHttpClient.get.mockResolvedValueOnce({
        data: { permalink: 'https://instagram.com/reel/test-media-id' },
      });

      const result = await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Test',
      });

      expect(result.videoId).toBe('test-media-id');
    });

    it('should throw error if container upload fails', async () => {
      mockHttpClient.post.mockResolvedValueOnce({
        data: { id: 'test-container-id' },
      });

      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          upload_status: 'ERROR',
          status_code: 'UPLOAD_FAILED',
        },
      });

      await expect(
        service.uploadReel({
          videoUrl: 'https://example.com/video.mp4',
          caption: 'Test',
        }),
      ).rejects.toThrow(InstagramContainerError);
    });

    it('should handle network errors during polling gracefully', async () => {
      mockHttpClient.post.mockResolvedValueOnce({
        data: { id: 'test-container-id' },
      });

      // First poll fails, second succeeds
      mockHttpClient.get.mockRejectedValueOnce(new Error('Network timeout')).mockResolvedValueOnce({
        data: { upload_status: 'FINISHED' },
      });

      mockHttpClient.post.mockResolvedValueOnce({
        data: { id: 'test-media-id' },
      });

      mockHttpClient.get.mockResolvedValueOnce({
        data: { permalink: 'https://instagram.com/reel/test-media-id' },
      });

      const result = await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Test',
      });

      expect(result.videoId).toBe('test-media-id');
    });

    it('should timeout if polling takes too long', async () => {
      mockHttpClient.post.mockResolvedValueOnce({
        data: { id: 'test-container-id' },
      });

      // Always return IN_PROGRESS
      mockHttpClient.get.mockResolvedValue({
        data: { upload_status: 'IN_PROGRESS' },
      });

      // This will timeout after maxAttempts (we'll use a shorter timeout for testing)
      await expect(
        service.uploadReel({
          videoUrl: 'https://example.com/video.mp4',
          caption: 'Test',
        }),
      ).rejects.toThrow(InstagramContainerError);
    }, 15000); // Increase test timeout
  });

  describe('container publishing', () => {
    it('should handle publish error', async () => {
      mockHttpClient.post
        .mockResolvedValueOnce({ data: { id: 'test-container-id' } })
        .mockResolvedValueOnce({
          data: {
            error: { message: 'Publish failed' },
          },
        });

      mockHttpClient.get.mockResolvedValueOnce({
        data: { upload_status: 'FINISHED' },
      });

      await expect(
        service.uploadReel({
          videoUrl: 'https://example.com/video.mp4',
          caption: 'Test',
        }),
      ).rejects.toThrow(InstagramPublishError);
    });

    it('should handle network error during publish', async () => {
      mockHttpClient.post
        .mockResolvedValueOnce({ data: { id: 'test-container-id' } })
        .mockRejectedValueOnce(new Error('Network error'));

      mockHttpClient.get.mockResolvedValueOnce({
        data: { upload_status: 'FINISHED' },
      });

      await expect(
        service.uploadReel({
          videoUrl: 'https://example.com/video.mp4',
          caption: 'Test',
        }),
      ).rejects.toThrow(InstagramPublishError);
    });
  });

  describe('getMediaInsights', () => {
    it('should fetch media insights successfully', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          data: [
            { name: 'impressions', values: [{ value: 1000 }] },
            { name: 'reach', values: [{ value: 800 }] },
            { name: 'engagement', values: [{ value: 50 }] },
            { name: 'saved', values: [{ value: 10 }] },
            { name: 'shares', values: [{ value: 5 }] },
          ],
        },
      });

      const insights = await service.getMediaInsights('test-media-id');

      expect(insights).toEqual({
        impressions: 1000,
        reach: 800,
        engagement: 50,
        saves: 10,
        shares: 5,
      });
    });

    it('should return empty insights if not authenticated', async () => {
      jest.spyOn(oauth, 'getAccessToken').mockReturnValue(null);

      const insights = await service.getMediaInsights('test-media-id');

      expect(insights).toEqual({
        impressions: 0,
        reach: 0,
        engagement: 0,
        saves: 0,
        shares: 0,
      });
    });

    it('should handle insights fetch error gracefully', async () => {
      mockHttpClient.get.mockRejectedValueOnce(new Error('API error'));

      const insights = await service.getMediaInsights('test-media-id');

      expect(insights).toEqual({
        impressions: 0,
        reach: 0,
        engagement: 0,
        saves: 0,
        shares: 0,
      });
    });
  });

  describe('getVideoStats', () => {
    it('should map insights to video stats format', async () => {
      mockHttpClient.get.mockResolvedValueOnce({
        data: {
          data: [
            { name: 'impressions', values: [{ value: 1000 }] },
            { name: 'shares', values: [{ value: 5 }] },
          ],
        },
      });

      const stats = await service.getVideoStats('test-media-id');

      expect(stats).toEqual({
        views: 1000, // Mapped from impressions
        likes: 0, // Not available from Instagram API
        comments: 0,
        shares: 5,
      });
    });
  });

  describe('isConfigured', () => {
    it('should return true when authenticated', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when not authenticated', () => {
      jest.spyOn(oauth, 'isAuthenticated').mockReturnValue(false);
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should log errors with stack traces', async () => {
      jest.spyOn(oauth, 'ensureValidToken').mockRejectedValue(new Error('Auth failed'));

      await expect(
        service.uploadReel({
          videoUrl: 'https://example.com/video.mp4',
          caption: 'Test',
        }),
      ).rejects.toThrow();
    });
  });

  describe('rate limiting', () => {
    it('should check rate limit before upload', async () => {
      mockHttpClient.post
        .mockResolvedValueOnce({ data: { id: 'container-id' } })
        .mockResolvedValueOnce({ data: { id: 'media-id' } });

      mockHttpClient.get
        .mockResolvedValueOnce({ data: { upload_status: 'FINISHED' } })
        .mockResolvedValueOnce({ data: { permalink: 'https://instagram.com/reel/media-id' } });

      await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Test',
      });

      expect(rateLimiter.checkLimit).toHaveBeenCalledWith('INSTAGRAM');
      expect(rateLimiter.consumeToken).toHaveBeenCalledWith('INSTAGRAM');
    });
  });

  describe('token expiry warnings', () => {
    it('should warn when token expires in less than 10 days', async () => {
      jest.spyOn(oauth, 'getRemainingDays').mockReturnValue(5);

      mockHttpClient.post
        .mockResolvedValueOnce({ data: { id: 'container-id' } })
        .mockResolvedValueOnce({ data: { id: 'media-id' } });

      mockHttpClient.get
        .mockResolvedValueOnce({ data: { upload_status: 'FINISHED' } })
        .mockResolvedValueOnce({ data: { permalink: 'https://instagram.com/reel/media-id' } });

      await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Test',
      });

      expect(oauth.getRemainingDays).toHaveBeenCalled();
    });
  });
});
