// @ts-nocheck

/**
 * Unit tests for VideoComposerService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VideoComposerService } from '@/modules/video/services/video-composer.service';
import { FFmpegService } from '@/modules/video/services/ffmpeg.service';
import { FileStorageService } from '@/modules/video/services/file-storage.service';
import { ProgressTrackerService } from '@/modules/video/services/progress-tracker.service';
import { ThumbnailGeneratorService } from '@/modules/video/services/thumbnail-generator.service';

describe('VideoComposerService', () => {
  let service: VideoComposerService;
  let configService: ConfigService;

  const mockConfig: Record<string, any> = {
    STORAGE_DIR: '/tmp/test-videos',
    STORAGE_MAX_PARALLEL: 5,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoComposerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => mockConfig[key] ?? defaultValue),
          },
        },
        {
          provide: FFmpegService,
          useValue: {
            compose: jest.fn(),
            generateThumbnail: jest.fn(),
            addCaptions: jest.fn(),
          },
        },
        {
          provide: FileStorageService,
          useValue: {
            upload: jest.fn(),
            download: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ProgressTrackerService,
          useValue: {
            track: jest.fn(),
            update: jest.fn(),
            complete: jest.fn(),
          },
        },
        {
          provide: ThumbnailGeneratorService,
          useValue: {
            generate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VideoComposerService>(VideoComposerService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with config service', () => {
      expect(configService).toBeDefined();
    });
  });

  describe('compose', () => {
    const mockProduct = {
      id: 'prod-123',
      title: 'Test Product',
      description: 'Test description',
      price: 29.99,
    };

    it('should compose video with voice and visuals', async () => {
      const result = await service.compose({
        voiceUrl: 'https://example.com/voice.mp3',
        visualsUrl: 'https://example.com/video.mp4',
        script: 'This is a test script',
        product: mockProduct,
      });

      expect(result).toBe('https://example.com/video.mp4');
    });

    it('should handle local file paths for voice', async () => {
      const result = await service.compose({
        voiceUrl: '/tmp/voice.mp3',
        visualsUrl: 'https://example.com/video.mp4',
        script: 'This is a test script',
        product: mockProduct,
      });

      expect(result).toBe('https://example.com/video.mp4');
    });

    it('should handle local file paths for visuals', async () => {
      const result = await service.compose({
        voiceUrl: 'https://example.com/voice.mp3',
        visualsUrl: '/tmp/video.mp4',
        script: 'This is a test script',
        product: mockProduct,
      });

      expect(result).toBe('/tmp/video.mp4');
    });

    it('should compose with empty script', async () => {
      const result = await service.compose({
        voiceUrl: 'https://example.com/voice.mp3',
        visualsUrl: 'https://example.com/video.mp4',
        script: '',
        product: mockProduct,
      });

      expect(result).toBe('https://example.com/video.mp4');
    });

    it('should compose with long script', async () => {
      const longScript = 'This is a very long script. '.repeat(100);

      const result = await service.compose({
        voiceUrl: 'https://example.com/voice.mp3',
        visualsUrl: 'https://example.com/video.mp4',
        script: longScript,
        product: mockProduct,
      });

      expect(result).toBe('https://example.com/video.mp4');
    });

    it('should compose with complex product data', async () => {
      const complexProduct = {
        id: 'prod-456',
        title: 'Complex Product',
        description: 'Description with special chars: @#$%^&*()',
        price: 99.99,
        category: 'Electronics',
        tags: ['popular', 'trending'],
      };

      const result = await service.compose({
        voiceUrl: 'https://example.com/voice.mp3',
        visualsUrl: 'https://example.com/video.mp4',
        script: 'Test script',
        product: complexProduct,
      });

      expect(result).toBe('https://example.com/video.mp4');
    });

    it('should handle missing product fields gracefully', async () => {
      const minimalProduct = {
        id: 'prod-789',
      };

      const result = await service.compose({
        voiceUrl: 'https://example.com/voice.mp3',
        visualsUrl: 'https://example.com/video.mp4',
        script: 'Test script',
        product: minimalProduct,
      });

      expect(result).toBe('https://example.com/video.mp4');
    });

    it('should log composition process', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.compose({
        voiceUrl: 'https://example.com/voice.mp3',
        visualsUrl: 'https://example.com/video.mp4',
        script: 'Test script',
        product: mockProduct,
      });

      expect(consoleSpy).toHaveBeenCalledWith('🎞️ Composing video...');
      expect(consoleSpy).toHaveBeenCalledWith('Voice: https://example.com/voice.mp3');
      expect(consoleSpy).toHaveBeenCalledWith('Visuals: https://example.com/video.mp4');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Video composed (mock)');

      consoleSpy.mockRestore();
    });
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail for video', async () => {
      const result = await service.generateThumbnail({
        videoUrl: 'https://example.com/video.mp4',
        productTitle: 'Test Product',
      });

      expect(result).toBe('https://via.placeholder.com/1080x1920.png?text=Video+Thumbnail');
    });

    it('should generate thumbnail with long product title', async () => {
      const longTitle = 'This is a very long product title that should still work';

      const result = await service.generateThumbnail({
        videoUrl: 'https://example.com/video.mp4',
        productTitle: longTitle,
      });

      expect(result).toBe('https://via.placeholder.com/1080x1920.png?text=Video+Thumbnail');
    });

    it('should generate thumbnail with special characters in title', async () => {
      const result = await service.generateThumbnail({
        videoUrl: 'https://example.com/video.mp4',
        productTitle: 'Product @ 50% OFF! #Sale',
      });

      expect(result).toBe('https://via.placeholder.com/1080x1920.png?text=Video+Thumbnail');
    });

    it('should generate thumbnail for local video path', async () => {
      const result = await service.generateThumbnail({
        videoUrl: '/tmp/video.mp4',
        productTitle: 'Test Product',
      });

      expect(result).toBe('https://via.placeholder.com/1080x1920.png?text=Video+Thumbnail');
    });

    it('should log thumbnail generation', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.generateThumbnail({
        videoUrl: 'https://example.com/video.mp4',
        productTitle: 'Test Product',
      });

      expect(consoleSpy).toHaveBeenCalledWith('🖼️ Generating thumbnail for: Test Product');

      consoleSpy.mockRestore();
    });
  });

  describe('addCaptions', () => {
    it('should add captions to video', async () => {
      const result = await service.addCaptions(
        'https://example.com/video.mp4',
        'This is a test script',
      );

      expect(result).toBe('https://example.com/video.mp4');
    });

    it('should add captions with empty script', async () => {
      const result = await service.addCaptions('https://example.com/video.mp4', '');

      expect(result).toBe('https://example.com/video.mp4');
    });

    it('should add captions with long script', async () => {
      const longScript = 'This is a very long script. '.repeat(100);

      const result = await service.addCaptions('https://example.com/video.mp4', longScript);

      expect(result).toBe('https://example.com/video.mp4');
    });

    it('should add captions for local video path', async () => {
      const result = await service.addCaptions('/tmp/video.mp4', 'Test script');

      expect(result).toBe('/tmp/video.mp4');
    });

    it('should add captions with special characters', async () => {
      const result = await service.addCaptions(
        'https://example.com/video.mp4',
        'Script with special chars: @#$%^&*()',
      );

      expect(result).toBe('https://example.com/video.mp4');
    });

    it('should log caption addition', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.addCaptions('https://example.com/video.mp4', 'Test script');

      expect(consoleSpy).toHaveBeenCalledWith('📝 Adding captions to video...');

      consoleSpy.mockRestore();
    });
  });

  describe.skip('addCTA', () => {
    it('should add CTA overlay to video', async () => {
      const result = await service.addCTA('https://example.com/video.mp4', 'Click link in bio!');

      expect(result).toBe('https://example.com/video.mp4');
    });

    it('should add CTA with empty text', async () => {
      const result = await service.addCTA('https://example.com/video.mp4', '');

      expect(result).toBe('https://example.com/video.mp4');
    });

    it('should add CTA with long text', async () => {
      const longCTA = 'This is a very long CTA message that should still work properly';

      const result = await service.addCTA('https://example.com/video.mp4', longCTA);

      expect(result).toBe('https://example.com/video.mp4');
    });

    it('should add CTA for local video path', async () => {
      const result = await service.addCTA('/tmp/video.mp4', 'Shop now!');

      expect(result).toBe('/tmp/video.mp4');
    });

    it('should add CTA with emojis', async () => {
      const result = await service.addCTA(
        'https://example.com/video.mp4',
        '🔥 Limited time offer! 🎁',
      );

      expect(result).toBe('https://example.com/video.mp4');
    });

    it('should add CTA with URLs', async () => {
      const result = await service.addCTA(
        'https://example.com/video.mp4',
        'Visit https://example.com',
      );

      expect(result).toBe('https://example.com/video.mp4');
    });

    it('should log CTA addition', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.addCTA('https://example.com/video.mp4', 'Click link in bio!');

      expect(consoleSpy).toHaveBeenCalledWith('🔗 Adding CTA overlay...');

      consoleSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle null product gracefully', async () => {
      const result = await service.compose({
        voiceUrl: 'https://example.com/voice.mp3',
        visualsUrl: 'https://example.com/video.mp4',
        script: 'Test script',
        product: null,
      });

      expect(result).toBe('https://example.com/video.mp4');
    });

    it('should handle undefined product gracefully', async () => {
      const result = await service.compose({
        voiceUrl: 'https://example.com/voice.mp3',
        visualsUrl: 'https://example.com/video.mp4',
        script: 'Test script',
        product: undefined,
      });

      expect(result).toBe('https://example.com/video.mp4');
    });

    it('should handle invalid URLs gracefully', async () => {
      const result = await service.compose({
        voiceUrl: 'not-a-valid-url',
        visualsUrl: 'also-invalid',
        script: 'Test script',
        product: { id: 'test' },
      });

      expect(result).toBe('also-invalid');
    });
  });
});
