/**
 * Unit tests for TiktokService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TiktokService } from '@/modules/publisher/services/tiktok.service';
import { SecretsManagerService } from '@/common/secrets/secrets-manager.service';

describe('TiktokService', () => {
  let service: TiktokService;
  let configService: ConfigService;
  let secretsManager: SecretsManagerService;

  const mockConfig: Record<string, string> = {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TiktokService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
        {
          provide: SecretsManagerService,
          useValue: {
            getSecrets: jest.fn().mockResolvedValue({
              'tiktok-client-key': 'test-client-key',
              'tiktok-client-secret': 'test-client-secret',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TiktokService>(TiktokService);
    configService = module.get<ConfigService>(ConfigService);
    secretsManager = module.get<SecretsManagerService>(SecretsManagerService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with credentials from secrets manager', async () => {
      await service.onModuleInit();

      expect(secretsManager.getSecrets).toHaveBeenCalledWith([
        { secretName: 'tiktok-client-key', envVarName: 'TIKTOK_CLIENT_KEY' },
        { secretName: 'tiktok-client-secret', envVarName: 'TIKTOK_CLIENT_SECRET' },
      ]);

      expect(service.isConfigured()).toBe(true);
    });

    it('should log success when credentials are found', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.onModuleInit();

      expect(consoleSpy).toHaveBeenCalledWith('✅ TikTok service initialized with credentials');

      consoleSpy.mockRestore();
    });

    it('should handle missing credentials gracefully', async () => {
      jest.spyOn(secretsManager, 'getSecrets').mockResolvedValue({
        'tiktok-client-key': '',
        'tiktok-client-secret': '',
      });

      await service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });

    it('should handle partial credentials', async () => {
      jest.spyOn(secretsManager, 'getSecrets').mockResolvedValue({
        'tiktok-client-key': 'test-key',
        'tiktok-client-secret': '',
      });

      await service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('uploadVideo', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should upload video to TikTok', async () => {
      const result = await service.uploadVideo({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Check out this amazing product! #fyp #trending',
      });

      expect(result).toHaveProperty('videoId');
      expect(result).toHaveProperty('url');
      expect(result.url).toContain('tiktok.com');
    });

    it('should return mock data when credentials not configured', async () => {
      jest.spyOn(service, 'isConfigured').mockReturnValue(false);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await service.uploadVideo({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Test caption',
      });

      expect(consoleSpy).toHaveBeenCalledWith('⚠️ TikTok credentials not configured, returning mock data');
      expect(result.videoId).toContain('TT');

      consoleSpy.mockRestore();
    });

    it('should handle captions with hashtags', async () => {
      const result = await service.uploadVideo({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Amazing product #affiliate #trending #fyp #viral',
      });

      expect(result).toHaveProperty('videoId');
      expect(result).toHaveProperty('url');
    });

    it('should handle long captions', async () => {
      const longCaption = 'This is a very long caption. '.repeat(20);

      const result = await service.uploadVideo({
        videoUrl: 'https://example.com/video.mp4',
        caption: longCaption,
      });

      expect(result).toHaveProperty('videoId');
    });

    it('should handle captions with emojis', async () => {
      const result = await service.uploadVideo({
        videoUrl: 'https://example.com/video.mp4',
        caption: '🔥 Hot deal! 🎁 Limited time offer! 💯 #sale',
      });

      expect(result).toHaveProperty('videoId');
    });

    it('should handle captions with mentions', async () => {
      const result = await service.uploadVideo({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Check out @brand amazing product! #fyp',
      });

      expect(result).toHaveProperty('videoId');
    });

    it('should handle empty caption', async () => {
      const result = await service.uploadVideo({
        videoUrl: 'https://example.com/video.mp4',
        caption: '',
      });

      expect(result).toHaveProperty('videoId');
    });

    it('should handle special characters in caption', async () => {
      const result = await service.uploadVideo({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Product @ 50% OFF! Save $$$',
      });

      expect(result).toHaveProperty('videoId');
    });

    it('should generate unique video IDs', async () => {
      const result1 = await service.uploadVideo({
        videoUrl: 'https://example.com/video1.mp4',
        caption: 'Caption 1',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const result2 = await service.uploadVideo({
        videoUrl: 'https://example.com/video2.mp4',
        caption: 'Caption 2',
      });

      expect(result1.videoId).not.toBe(result2.videoId);
    });

    it('should handle local file paths', async () => {
      const result = await service.uploadVideo({
        videoUrl: '/tmp/video.mp4',
        caption: 'Test caption',
      });

      expect(result).toHaveProperty('videoId');
    });

    it('should log upload attempt', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.uploadVideo({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Test caption with some text',
      });

      expect(consoleSpy).toHaveBeenCalledWith('🎵 TikTok: Uploading video - Test caption with some text...');

      consoleSpy.mockRestore();
    });

    it('should truncate long captions in log', async () => {
      jest.clearAllMocks(); // Clear previous mock calls
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const longCaption = 'a'.repeat(100);

      await service.uploadVideo({
        videoUrl: 'https://example.com/video.mp4',
        caption: longCaption,
      });

      expect(consoleSpy).toHaveBeenCalled();
      const logMessage = consoleSpy.mock.calls[0][0];
      expect(logMessage).toContain('...');

      consoleSpy.mockRestore();
    });

    it('should handle unicode characters in caption', async () => {
      const result = await service.uploadVideo({
        videoUrl: 'https://example.com/video.mp4',
        caption: '你好 世界 🌍 #chinese #fyp',
      });

      expect(result).toHaveProperty('videoId');
    });
  });

  describe('getVideoStats', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return video statistics', async () => {
      const stats = await service.getVideoStats('test-video-id');

      expect(stats).toHaveProperty('views');
      expect(stats).toHaveProperty('likes');
      expect(stats).toHaveProperty('comments');
      expect(stats).toHaveProperty('shares');
    });

    it('should return zero stats for non-existent video', async () => {
      const stats = await service.getVideoStats('non-existent-id');

      expect(stats.views).toBe(0);
      expect(stats.likes).toBe(0);
      expect(stats.comments).toBe(0);
      expect(stats.shares).toBe(0);
    });

    it('should handle empty video ID', async () => {
      const stats = await service.getVideoStats('');

      expect(stats).toBeDefined();
    });

    it('should handle very long video ID', async () => {
      const longId = 'a'.repeat(1000);

      const stats = await service.getVideoStats(longId);

      expect(stats).toBeDefined();
    });
  });

  describe('isConfigured', () => {
    it('should return true when both credentials are set', async () => {
      await service.onModuleInit();

      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when client key is missing', async () => {
      jest.spyOn(secretsManager, 'getSecrets').mockResolvedValue({
        'tiktok-client-key': '',
        'tiktok-client-secret': 'test-secret',
      });

      await service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });

    it('should return false when client secret is missing', async () => {
      jest.spyOn(secretsManager, 'getSecrets').mockResolvedValue({
        'tiktok-client-key': 'test-key',
        'tiktok-client-secret': '',
      });

      await service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });

    it('should return false when both credentials are missing', async () => {
      jest.spyOn(secretsManager, 'getSecrets').mockResolvedValue({
        'tiktok-client-key': '',
        'tiktok-client-secret': '',
      });

      await service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('rate limiting', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should handle multiple uploads', async () => {
      const uploads = [];

      for (let i = 0; i < 5; i++) {
        uploads.push(
          service.uploadVideo({
            videoUrl: `https://example.com/video${i}.mp4`,
            caption: `Caption ${i} #fyp`,
          }),
        );
      }

      const results = await Promise.all(uploads);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toHaveProperty('videoId');
        expect(result).toHaveProperty('url');
      });
    });

    it('should generate unique URLs for each upload', async () => {
      const result1 = await service.uploadVideo({
        videoUrl: 'https://example.com/video1.mp4',
        caption: 'Caption 1',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const result2 = await service.uploadVideo({
        videoUrl: 'https://example.com/video2.mp4',
        caption: 'Caption 2',
      });

      expect(result1.url).not.toBe(result2.url);
    });

    it('should handle rapid sequential uploads', async () => {
      const results = [];

      for (let i = 0; i < 3; i++) {
        const result = await service.uploadVideo({
          videoUrl: `https://example.com/video${i}.mp4`,
          caption: `Caption ${i}`,
        });
        results.push(result);
      }

      expect(results).toHaveLength(3);

      const videoIds = results.map(r => r.videoId);
      const uniqueIds = new Set(videoIds);
      expect(uniqueIds.size).toBe(3);
    });
  });
});
