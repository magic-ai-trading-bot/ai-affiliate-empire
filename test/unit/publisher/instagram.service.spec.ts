/**
 * Unit tests for InstagramService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InstagramService } from '@/modules/publisher/services/instagram.service';
import { SecretsManagerService } from '@/common/secrets/secrets-manager.service';

describe('InstagramService', () => {
  let service: InstagramService;
  let configService: ConfigService;
  let secretsManager: SecretsManagerService;

  const mockConfig: Record<string, string> = {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstagramService,
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
              'instagram-access-token': 'test-access-token',
              'instagram-business-account-id': 'test-account-id',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<InstagramService>(InstagramService);
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
        { secretName: 'instagram-access-token', envVarName: 'INSTAGRAM_ACCESS_TOKEN' },
        { secretName: 'instagram-business-account-id', envVarName: 'INSTAGRAM_BUSINESS_ACCOUNT_ID' },
      ]);

      expect(service.isConfigured()).toBe(true);
    });

    it('should log success when credentials are found', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.onModuleInit();

      expect(consoleSpy).toHaveBeenCalledWith('✅ Instagram service initialized with credentials');

      consoleSpy.mockRestore();
    });

    it('should handle missing credentials gracefully', async () => {
      jest.spyOn(secretsManager, 'getSecrets').mockResolvedValue({
        'instagram-access-token': '',
        'instagram-business-account-id': '',
      });

      await service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });

    it('should handle partial credentials', async () => {
      jest.spyOn(secretsManager, 'getSecrets').mockResolvedValue({
        'instagram-access-token': 'test-token',
        'instagram-business-account-id': '',
      });

      await service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('uploadReel', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should upload reel to Instagram', async () => {
      const result = await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Check out this amazing product! #affiliate #trending',
      });

      expect(result).toHaveProperty('mediaId');
      expect(result).toHaveProperty('url');
      expect(result.url).toContain('instagram.com/reel/');
    });

    it('should return mock data when credentials not configured', async () => {
      jest.spyOn(service, 'isConfigured').mockReturnValue(false);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Test caption',
      });

      expect(consoleSpy).toHaveBeenCalledWith('⚠️ Instagram credentials not configured, returning mock data');
      expect(result.mediaId).toContain('IG');

      consoleSpy.mockRestore();
    });

    it('should handle captions with hashtags', async () => {
      const result = await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Amazing product #affiliate #trending #viral #reels',
      });

      expect(result).toHaveProperty('mediaId');
      expect(result).toHaveProperty('url');
    });

    it('should handle long captions', async () => {
      const longCaption = 'This is a very long caption. '.repeat(20);

      const result = await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: longCaption,
      });

      expect(result).toHaveProperty('mediaId');
    });

    it('should handle captions with emojis', async () => {
      const result = await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: '🔥 Hot deal! 🎁 Limited time! 💯 #sale',
      });

      expect(result).toHaveProperty('mediaId');
    });

    it('should handle captions with mentions', async () => {
      const result = await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Amazing @brand product! #reels',
      });

      expect(result).toHaveProperty('mediaId');
    });

    it('should handle empty caption', async () => {
      const result = await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: '',
      });

      expect(result).toHaveProperty('mediaId');
    });

    it('should handle special characters in caption', async () => {
      const result = await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Product @ 50% OFF! Save $$$',
      });

      expect(result).toHaveProperty('mediaId');
    });

    it('should generate unique media IDs', async () => {
      const result1 = await service.uploadReel({
        videoUrl: 'https://example.com/video1.mp4',
        caption: 'Caption 1',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const result2 = await service.uploadReel({
        videoUrl: 'https://example.com/video2.mp4',
        caption: 'Caption 2',
      });

      expect(result1.mediaId).not.toBe(result2.mediaId);
    });

    it('should handle local file paths', async () => {
      const result = await service.uploadReel({
        videoUrl: '/tmp/video.mp4',
        caption: 'Test caption',
      });

      expect(result).toHaveProperty('mediaId');
    });

    it('should log upload attempt', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Test caption with some text',
      });

      expect(consoleSpy).toHaveBeenCalledWith('📸 Instagram: Uploading Reel - Test caption with some text...');

      consoleSpy.mockRestore();
    });

    it('should truncate long captions in log', async () => {
      jest.clearAllMocks(); // Clear previous mock calls
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const longCaption = 'a'.repeat(100);

      await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: longCaption,
      });

      expect(consoleSpy).toHaveBeenCalled();
      const logMessage = consoleSpy.mock.calls[0][0];
      expect(logMessage).toContain('...');

      consoleSpy.mockRestore();
    });

    it('should handle unicode characters in caption', async () => {
      const result = await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: '你好 世界 🌍 #chinese #reels',
      });

      expect(result).toHaveProperty('mediaId');
    });

    it('should handle captions with line breaks', async () => {
      const result = await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4',
        caption: 'Line 1\nLine 2\nLine 3\n#reels',
      });

      expect(result).toHaveProperty('mediaId');
    });
  });

  describe('getMediaInsights', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return media insights', async () => {
      const insights = await service.getMediaInsights('test-media-id');

      expect(insights).toHaveProperty('impressions');
      expect(insights).toHaveProperty('reach');
      expect(insights).toHaveProperty('engagement');
      expect(insights).toHaveProperty('saves');
      expect(insights).toHaveProperty('shares');
    });

    it('should return zero insights for non-existent media', async () => {
      const insights = await service.getMediaInsights('non-existent-id');

      expect(insights.impressions).toBe(0);
      expect(insights.reach).toBe(0);
      expect(insights.engagement).toBe(0);
      expect(insights.saves).toBe(0);
      expect(insights.shares).toBe(0);
    });

    it('should handle empty media ID', async () => {
      const insights = await service.getMediaInsights('');

      expect(insights).toBeDefined();
    });

    it('should handle very long media ID', async () => {
      const longId = 'a'.repeat(1000);

      const insights = await service.getMediaInsights(longId);

      expect(insights).toBeDefined();
    });
  });

  describe('isConfigured', () => {
    it('should return true when both credentials are set', async () => {
      await service.onModuleInit();

      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when access token is missing', async () => {
      jest.spyOn(secretsManager, 'getSecrets').mockResolvedValue({
        'instagram-access-token': '',
        'instagram-business-account-id': 'test-id',
      });

      await service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });

    it('should return false when business account ID is missing', async () => {
      jest.spyOn(secretsManager, 'getSecrets').mockResolvedValue({
        'instagram-access-token': 'test-token',
        'instagram-business-account-id': '',
      });

      await service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });

    it('should return false when both credentials are missing', async () => {
      jest.spyOn(secretsManager, 'getSecrets').mockResolvedValue({
        'instagram-access-token': '',
        'instagram-business-account-id': '',
      });

      await service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('media container workflow', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should handle multiple reel uploads', async () => {
      const uploads = [];

      for (let i = 0; i < 5; i++) {
        uploads.push(
          service.uploadReel({
            videoUrl: `https://example.com/video${i}.mp4`,
            caption: `Caption ${i} #reels`,
          }),
        );
      }

      const results = await Promise.all(uploads);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toHaveProperty('mediaId');
        expect(result).toHaveProperty('url');
      });
    });

    it('should generate unique URLs for each upload', async () => {
      const result1 = await service.uploadReel({
        videoUrl: 'https://example.com/video1.mp4',
        caption: 'Caption 1',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const result2 = await service.uploadReel({
        videoUrl: 'https://example.com/video2.mp4',
        caption: 'Caption 2',
      });

      expect(result1.url).not.toBe(result2.url);
    });

    it('should handle rapid sequential uploads', async () => {
      const results = [];

      for (let i = 0; i < 3; i++) {
        const result = await service.uploadReel({
          videoUrl: `https://example.com/video${i}.mp4`,
          caption: `Caption ${i}`,
        });
        results.push(result);
      }

      expect(results).toHaveLength(3);

      const mediaIds = results.map(r => r.mediaId);
      const uniqueIds = new Set(mediaIds);
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('Graph API integration', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should handle video URLs with query parameters', async () => {
      const result = await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4?token=abc123',
        caption: 'Test caption',
      });

      expect(result).toHaveProperty('mediaId');
    });

    it('should handle video URLs with fragments', async () => {
      const result = await service.uploadReel({
        videoUrl: 'https://example.com/video.mp4#section',
        caption: 'Test caption',
      });

      expect(result).toHaveProperty('mediaId');
    });

    it('should handle very long video URLs', async () => {
      const longUrl = 'https://example.com/very/long/path/' + 'segment/'.repeat(50) + 'video.mp4';

      const result = await service.uploadReel({
        videoUrl: longUrl,
        caption: 'Test caption',
      });

      expect(result).toHaveProperty('mediaId');
    });
  });
});
