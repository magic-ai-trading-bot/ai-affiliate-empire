import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TiktokService } from '../../../src/modules/publisher/services/tiktok.service';
import { TiktokOAuth2Service } from '../../../src/modules/publisher/services/tiktok-oauth2.service';
import { FileDownloaderService } from '../../../src/modules/publisher/services/file-downloader.service';
import { TikTokVideoValidatorService } from '../../../src/modules/publisher/services/tiktok-video-validator.service';
import { RateLimiterService } from '../../../src/modules/publisher/services/rate-limiter.service';
import { SecretsManagerService } from '../../../src/common/secrets/secrets-manager.service';
import {
  TiktokAuthenticationError,
  TiktokUploadError,
  TiktokValidationError,
  TiktokChunkUploadError,
} from '../../../src/modules/publisher/exceptions/tiktok.exceptions';
import { RateLimitError } from '../../../src/modules/publisher/exceptions/youtube.exceptions';
import * as fs from 'fs';

// Mock axios
jest.mock('axios');

// Mock fs before importing service
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  statSync: jest.fn(),
  openSync: jest.fn(),
  closeSync: jest.fn(),
  readSync: jest.fn(),
}));

describe('TiktokService', () => {
  let service: TiktokService;
  let oauth: TiktokOAuth2Service;
  let downloader: FileDownloaderService;
  let validator: TikTokVideoValidatorService;
  let rateLimiter: RateLimiterService;

  const mockAccessToken = 'mock-tiktok-access-token';
  const mockUploadId = 'upload-123';
  const mockUploadUrl = 'https://upload.tiktok.com/test';
  const mockVideoId = 'video-123';
  const mockPublishId = 'publish-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TiktokService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                TIKTOK_CLIENT_KEY: 'mock-client-key',
                TIKTOK_CLIENT_SECRET: 'mock-client-secret',
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
          provide: TiktokOAuth2Service,
          useValue: {
            ensureValidToken: jest.fn().mockResolvedValue(mockAccessToken),
            getAccessToken: jest.fn().mockReturnValue(mockAccessToken),
            isAuthenticated: jest.fn().mockReturnValue(true),
            loadTokens: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: FileDownloaderService,
          useValue: {
            downloadVideo: jest.fn().mockResolvedValue({
              path: '/tmp/test-video.mp4',
              size: 10 * 1024 * 1024, // 10MB
              mimeType: 'video/mp4',
            }),
            cleanupFile: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: TikTokVideoValidatorService,
          useValue: {
            validateVideo: jest.fn().mockResolvedValue({
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

    service = module.get<TiktokService>(TiktokService);
    oauth = module.get<TiktokOAuth2Service>(TiktokOAuth2Service);
    downloader = module.get<FileDownloaderService>(FileDownloaderService);
    validator = module.get<TikTokVideoValidatorService>(TikTokVideoValidatorService);
    rateLimiter = module.get<RateLimiterService>(RateLimiterService);

    // Mock httpClient for service
    (service as any).httpClient = {
      post: jest.fn(),
      put: jest.fn(),
      get: jest.fn(),
    };

    // Mock fs methods
    (fs.statSync as jest.Mock).mockReturnValue({ size: 10 * 1024 * 1024 });
    (fs.openSync as jest.Mock).mockReturnValue(3);
    (fs.closeSync as jest.Mock).mockImplementation(() => {});
    (fs.readSync as jest.Mock).mockImplementation(() => 1024);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadVideo', () => {
    it('should successfully upload video with chunked upload', async () => {
      // Mock API responses
      (service as any).httpClient.post.mockImplementation((url: string) => {
        if (url.includes('/init/')) {
          return Promise.resolve({
            data: {
              data: {
                upload_id: mockUploadId,
                upload_url: mockUploadUrl,
              },
            },
          });
        }
        if (url.includes('/video/')) {
          return Promise.resolve({
            data: {
              data: {
                publish_id: mockPublishId,
                video_id: mockVideoId,
              },
            },
          });
        }
      });

      (service as any).httpClient.put.mockResolvedValue({ status: 200 });

      const result = await service.uploadVideo({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Test TikTok video',
      });

      expect(result).toEqual({
        videoId: mockVideoId,
        url: `https://www.tiktok.com/@user/video/${mockVideoId}`,
        platform: 'TIKTOK',
        status: 'PUBLISHED',
        publishedAt: expect.any(Date),
      });

      // Verify OAuth2 called
      expect(oauth.ensureValidToken).toHaveBeenCalled();

      // Verify rate limit checked
      expect(rateLimiter.checkLimit).toHaveBeenCalledWith('TIKTOK');

      // Verify video downloaded
      expect(downloader.downloadVideo).toHaveBeenCalledWith('https://example.com/video.mp4');

      // Verify video validated
      expect(validator.validateVideo).toHaveBeenCalledWith('/tmp/test-video.mp4');

      // Verify rate limit consumed
      expect(rateLimiter.consumeToken).toHaveBeenCalledWith('TIKTOK');

      // Verify cleanup
      expect(downloader.cleanupFile).toHaveBeenCalledWith('/tmp/test-video.mp4');
    });

    it('should fail if not authenticated', async () => {
      jest.spyOn(oauth, 'ensureValidToken').mockResolvedValue(null);

      await expect(
        service.uploadVideo({
          videoUrl: 'https://example.com/video.mp4',
          caption: 'Test video',
        }),
      ).rejects.toThrow(TiktokAuthenticationError);

      expect(downloader.downloadVideo).not.toHaveBeenCalled();
    });

    it('should fail if rate limit exceeded', async () => {
      jest.spyOn(rateLimiter, 'checkLimit').mockResolvedValue(false);

      await expect(
        service.uploadVideo({
          videoUrl: 'https://example.com/video.mp4',
          caption: 'Test video',
        }),
      ).rejects.toThrow(RateLimitError);

      expect(downloader.downloadVideo).not.toHaveBeenCalled();
    });

    it('should fail if video validation fails', async () => {
      jest.spyOn(validator, 'validateVideo').mockResolvedValue({
        isValid: false,
        errors: ['File size too small'],
      });

      await expect(
        service.uploadVideo({
          videoUrl: 'https://example.com/video.mp4',
          caption: 'Test video',
        }),
      ).rejects.toThrow(TiktokValidationError);

      expect(downloader.cleanupFile).toHaveBeenCalled();
    });

    it('should fail if init upload fails', async () => {
      (service as any).httpClient.post.mockResolvedValue({
        data: {
          error: {
            message: 'Invalid request',
          },
        },
      });

      await expect(
        service.uploadVideo({
          videoUrl: 'https://example.com/video.mp4',
          caption: 'Test video',
        }),
      ).rejects.toThrow(TiktokUploadError);
    });

    it('should retry chunk upload on failure', async () => {
      (service as any).httpClient.post
        .mockResolvedValueOnce({
          data: {
            data: {
              upload_id: mockUploadId,
              upload_url: mockUploadUrl,
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              publish_id: mockPublishId,
              video_id: mockVideoId,
            },
          },
        });

      // First attempt fails, second succeeds
      (service as any).httpClient.put
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ status: 200 });

      const result = await service.uploadVideo({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Test video',
      });

      expect(result.videoId).toBe(mockVideoId);
      expect((service as any).httpClient.put).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      (service as any).httpClient.post.mockResolvedValueOnce({
        data: {
          data: {
            upload_id: mockUploadId,
            upload_url: mockUploadUrl,
          },
        },
      });

      // All attempts fail
      (service as any).httpClient.put.mockRejectedValue(new Error('Network error'));

      await expect(
        service.uploadVideo({
          videoUrl: 'https://example.com/video.mp4',
          caption: 'Test video',
        }),
      ).rejects.toThrow(TiktokChunkUploadError);

      expect((service as any).httpClient.put).toHaveBeenCalledTimes(3); // MAX_RETRIES = 3
    });

    it('should add #TikTok hashtag to caption', async () => {
      (service as any).httpClient.post
        .mockResolvedValueOnce({
          data: {
            data: {
              upload_id: mockUploadId,
              upload_url: mockUploadUrl,
            },
          },
        })
        .mockImplementation((url: string, data: any) => {
          if (url.includes('/video/')) {
            expect(data.post_info.description).toContain('#TikTok');
            return Promise.resolve({
              data: {
                data: {
                  publish_id: mockPublishId,
                  video_id: mockVideoId,
                },
              },
            });
          }
        });

      (service as any).httpClient.put.mockResolvedValue({ status: 200 });

      await service.uploadVideo({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Test video without hashtag',
      });
    });

    it('should not duplicate #TikTok hashtag', async () => {
      (service as any).httpClient.post
        .mockResolvedValueOnce({
          data: {
            data: {
              upload_id: mockUploadId,
              upload_url: mockUploadUrl,
            },
          },
        })
        .mockImplementation((url: string, data: any) => {
          if (url.includes('/video/')) {
            const description = data.post_info.description;
            const count = (description.match(/#TikTok/g) || []).length;
            expect(count).toBe(1);
            return Promise.resolve({
              data: {
                data: {
                  publish_id: mockPublishId,
                  video_id: mockVideoId,
                },
              },
            });
          }
        });

      (service as any).httpClient.put.mockResolvedValue({ status: 200 });

      await service.uploadVideo({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Test video #TikTok already has it',
      });
    });

    it('should handle publish failure', async () => {
      (service as any).httpClient.post
        .mockResolvedValueOnce({
          data: {
            data: {
              upload_id: mockUploadId,
              upload_url: mockUploadUrl,
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            error: {
              message: 'Publish failed',
            },
          },
        });

      (service as any).httpClient.put.mockResolvedValue({ status: 200 });

      await expect(
        service.uploadVideo({
          videoUrl: 'https://example.com/video.mp4',
          caption: 'Test video',
        }),
      ).rejects.toThrow(TiktokUploadError);
    });
  });

  describe('getVideoStats', () => {
    it('should fetch video statistics', async () => {
      (service as any).httpClient.get.mockResolvedValue({
        data: {
          data: {
            video_view_count: 1000,
            video_like_count: 50,
            video_comment_count: 10,
            video_share_count: 5,
          },
        },
      });

      const stats = await service.getVideoStats(mockVideoId);

      expect(stats).toEqual({
        views: 1000,
        likes: 50,
        comments: 10,
        shares: 5,
      });
    });

    it('should return zeros if stats unavailable', async () => {
      (service as any).httpClient.get.mockRejectedValue(new Error('API error'));

      const stats = await service.getVideoStats(mockVideoId);

      expect(stats).toEqual({
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      });
    });

    it('should return zeros if not authenticated', async () => {
      jest.spyOn(oauth, 'getAccessToken').mockReturnValue(null);

      const stats = await service.getVideoStats(mockVideoId);

      expect(stats).toEqual({
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      });
    });
  });

  describe('isConfigured', () => {
    it('should return true if authenticated', () => {
      jest.spyOn(oauth, 'isAuthenticated').mockReturnValue(true);

      expect(service.isConfigured()).toBe(true);
    });

    it('should return false if not authenticated', () => {
      jest.spyOn(oauth, 'isAuthenticated').mockReturnValue(false);

      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('chunked upload', () => {
    it('should upload video in multiple chunks for large files', async () => {
      const fileSize = 150 * 1024 * 1024; // 150MB (requires 3 chunks at 64MB each)
      (fs.statSync as jest.Mock).mockReturnValue({ size: fileSize });

      (service as any).httpClient.post
        .mockResolvedValueOnce({
          data: {
            data: {
              upload_id: mockUploadId,
              upload_url: mockUploadUrl,
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              publish_id: mockPublishId,
              video_id: mockVideoId,
            },
          },
        });

      (service as any).httpClient.put.mockResolvedValue({ status: 200 });

      await service.uploadVideo({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Large video test',
      });

      // Should upload 3 chunks (64MB + 64MB + 22MB)
      expect((service as any).httpClient.put).toHaveBeenCalledTimes(3);
    });

    it('should upload small video in single chunk', async () => {
      const fileSize = 10 * 1024 * 1024; // 10MB
      (fs.statSync as jest.Mock).mockReturnValue({ size: fileSize });

      (service as any).httpClient.post
        .mockResolvedValueOnce({
          data: {
            data: {
              upload_id: mockUploadId,
              upload_url: mockUploadUrl,
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: {
              publish_id: mockPublishId,
              video_id: mockVideoId,
            },
          },
        });

      (service as any).httpClient.put.mockResolvedValue({ status: 200 });

      await service.uploadVideo({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Small video test',
      });

      // Should upload 1 chunk
      expect((service as any).httpClient.put).toHaveBeenCalledTimes(1);
    });
  });
});
