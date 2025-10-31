/**
 * Unit tests for YoutubeService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { YoutubeService } from '@/modules/publisher/services/youtube.service';
import { SecretsManagerService } from '@/common/secrets/secrets-manager.service';

describe('YoutubeService', () => {
  let service: YoutubeService;
  let configService: ConfigService;
  let secretsManager: SecretsManagerService;

  const mockConfig: Record<string, string> = {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YoutubeService,
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
              'youtube-client-id': 'test-client-id',
              'youtube-client-secret': 'test-client-secret',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<YoutubeService>(YoutubeService);
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
        { secretName: 'youtube-client-id', envVarName: 'YOUTUBE_CLIENT_ID' },
        { secretName: 'youtube-client-secret', envVarName: 'YOUTUBE_CLIENT_SECRET' },
      ]);

      expect(service.isConfigured()).toBe(true);
    });

    it('should log success when credentials are found', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.onModuleInit();

      expect(consoleSpy).toHaveBeenCalledWith('✅ YouTube service initialized with credentials');

      consoleSpy.mockRestore();
    });

    it('should handle missing credentials gracefully', async () => {
      jest.spyOn(secretsManager, 'getSecrets').mockResolvedValue({
        'youtube-client-id': '',
        'youtube-client-secret': '',
      });

      await service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });

    it('should handle partial credentials', async () => {
      jest.spyOn(secretsManager, 'getSecrets').mockResolvedValue({
        'youtube-client-id': 'test-id',
        'youtube-client-secret': '',
      });

      await service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('uploadShort', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should upload video as YouTube Short', async () => {
      const result = await service.uploadShort({
        videoUrl: 'https://example.com/video.mp4',
        title: 'Test Short',
        description: 'This is a test short #Shorts',
      });

      expect(result).toHaveProperty('videoId');
      expect(result).toHaveProperty('url');
      expect(result.url).toContain('youtube.com/shorts/');
    });

    it('should upload with thumbnail', async () => {
      const result = await service.uploadShort({
        videoUrl: 'https://example.com/video.mp4',
        title: 'Test Short',
        description: 'Test description',
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
      });

      expect(result).toHaveProperty('videoId');
      expect(result).toHaveProperty('url');
    });

    it('should return mock data when credentials not configured', async () => {
      jest.spyOn(service, 'isConfigured').mockReturnValue(false);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await service.uploadShort({
        videoUrl: 'https://example.com/video.mp4',
        title: 'Test Short',
        description: 'Test description',
      });

      expect(consoleSpy).toHaveBeenCalledWith('⚠️ YouTube credentials not configured, returning mock data');
      expect(result.videoId).toContain('YT');

      consoleSpy.mockRestore();
    });

    it('should handle long titles', async () => {
      const longTitle = 'This is a very long title that exceeds normal length but should still be handled properly';

      const result = await service.uploadShort({
        videoUrl: 'https://example.com/video.mp4',
        title: longTitle,
        description: 'Test description',
      });

      expect(result).toHaveProperty('videoId');
    });

    it('should handle long descriptions', async () => {
      const longDescription = 'Description '.repeat(200);

      const result = await service.uploadShort({
        videoUrl: 'https://example.com/video.mp4',
        title: 'Test Short',
        description: longDescription,
      });

      expect(result).toHaveProperty('videoId');
    });

    it('should handle special characters in title', async () => {
      const result = await service.uploadShort({
        videoUrl: 'https://example.com/video.mp4',
        title: 'Test @ #Shorts 🔥',
        description: 'Test description',
      });

      expect(result).toHaveProperty('videoId');
    });

    it('should handle special characters in description', async () => {
      const result = await service.uploadShort({
        videoUrl: 'https://example.com/video.mp4',
        title: 'Test Short',
        description: 'Description with @mentions #hashtags and 🎉 emojis',
      });

      expect(result).toHaveProperty('videoId');
    });

    it('should generate unique video IDs', async () => {
      const result1 = await service.uploadShort({
        videoUrl: 'https://example.com/video1.mp4',
        title: 'Test Short 1',
        description: 'Description 1',
      });

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const result2 = await service.uploadShort({
        videoUrl: 'https://example.com/video2.mp4',
        title: 'Test Short 2',
        description: 'Description 2',
      });

      expect(result1.videoId).not.toBe(result2.videoId);
    });

    it('should handle local file paths', async () => {
      const result = await service.uploadShort({
        videoUrl: '/tmp/video.mp4',
        title: 'Test Short',
        description: 'Test description',
      });

      expect(result).toHaveProperty('videoId');
    });

    it('should log upload attempt', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.uploadShort({
        videoUrl: 'https://example.com/video.mp4',
        title: 'Test Short',
        description: 'Test description',
      });

      expect(consoleSpy).toHaveBeenCalledWith('📺 YouTube: Uploading Short - Test Short');

      consoleSpy.mockRestore();
    });

    it('should handle empty description', async () => {
      const result = await service.uploadShort({
        videoUrl: 'https://example.com/video.mp4',
        title: 'Test Short',
        description: '',
      });

      expect(result).toHaveProperty('videoId');
    });

    it('should handle missing thumbnail URL', async () => {
      const result = await service.uploadShort({
        videoUrl: 'https://example.com/video.mp4',
        title: 'Test Short',
        description: 'Test description',
        thumbnailUrl: undefined,
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

    it('should return false when client ID is missing', async () => {
      jest.spyOn(secretsManager, 'getSecrets').mockResolvedValue({
        'youtube-client-id': '',
        'youtube-client-secret': 'test-secret',
      });

      await service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });

    it('should return false when client secret is missing', async () => {
      jest.spyOn(secretsManager, 'getSecrets').mockResolvedValue({
        'youtube-client-id': 'test-id',
        'youtube-client-secret': '',
      });

      await service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });

    it('should return false when both credentials are missing', async () => {
      jest.spyOn(secretsManager, 'getSecrets').mockResolvedValue({
        'youtube-client-id': '',
        'youtube-client-secret': '',
      });

      await service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('quota management', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should handle multiple uploads', async () => {
      const uploads = [];

      for (let i = 0; i < 5; i++) {
        uploads.push(
          service.uploadShort({
            videoUrl: `https://example.com/video${i}.mp4`,
            title: `Test Short ${i}`,
            description: `Description ${i}`,
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
      const result1 = await service.uploadShort({
        videoUrl: 'https://example.com/video1.mp4',
        title: 'Test 1',
        description: 'Desc 1',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const result2 = await service.uploadShort({
        videoUrl: 'https://example.com/video2.mp4',
        title: 'Test 2',
        description: 'Desc 2',
      });

      expect(result1.url).not.toBe(result2.url);
    });
  });
});
