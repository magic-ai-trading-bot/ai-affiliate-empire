/**
 * Unit tests for VideoService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VideoService } from '@/modules/video/video.service';
import { PrismaService } from '@/common/database/prisma.service';
import { PikaLabsService } from '@/modules/video/services/pikalabs.service';
import { ElevenLabsService } from '@/modules/video/services/elevenlabs.service';
import { VideoComposerService } from '@/modules/video/services/video-composer.service';
import { MockPrismaService, mockPrismaService } from '../../mocks/prisma.mock';

describe('VideoService', () => {
  let service: VideoService;
  let _prisma: MockPrismaService;
  let pikaLabs: jest.Mocked<PikaLabsService>;
  let elevenLabs: jest.Mocked<ElevenLabsService>;
  let composer: jest.Mocked<VideoComposerService>;

  const mockProduct = {
    id: 'prod-1',
    title: 'Test Product',
    description: 'Test description',
    price: 99.99,
    category: 'Electronics',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVideo = {
    id: 'video-1',
    productId: 'prod-1',
    title: 'Test Product - Video',
    script: 'This is a test script',
    duration: 60,
    status: 'READY',
    videoUrl: 'https://example.com/video.mp4',
    voiceUrl: 'https://example.com/voice.mp3',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    generatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    product: mockProduct,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoService,
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
        {
          provide: PikaLabsService,
          useValue: {
            generateVideo: jest.fn(),
          },
        },
        {
          provide: ElevenLabsService,
          useValue: {
            generateVoice: jest.fn(),
          },
        },
        {
          provide: VideoComposerService,
          useValue: {
            compose: jest.fn(),
            generateThumbnail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VideoService>(VideoService);
    _prisma = module.get<MockPrismaService>(PrismaService);
    pikaLabs = module.get(PikaLabsService);
    elevenLabs = module.get(ElevenLabsService);
    composer = module.get(VideoComposerService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('generateVideo', () => {
    describe('with existing videoId', () => {
      it('should generate video from existing video record', async () => {
        const pendingVideo = { ...mockVideo, status: 'PENDING' };
        mockPrismaService.video.findUnique.mockResolvedValue(pendingVideo as any);
        mockPrismaService.video.update.mockResolvedValue(mockVideo as any);
        elevenLabs.generateVoice.mockResolvedValue('https://example.com/voice.mp3');
        pikaLabs.generateVideo.mockResolvedValue('https://example.com/visuals.mp4');
        composer.compose.mockResolvedValue('https://example.com/final.mp4');
        composer.generateThumbnail.mockResolvedValue('https://example.com/thumb.jpg');

        const result = await service.generateVideo({
          videoId: 'video-1',
        });

        expect(result).toBeDefined();
        expect(mockPrismaService.video.findUnique).toHaveBeenCalledWith({
          where: { id: 'video-1' },
          include: { product: true },
        });
        expect(elevenLabs.generateVoice).toHaveBeenCalled();
        expect(pikaLabs.generateVideo).toHaveBeenCalled();
        expect(composer.compose).toHaveBeenCalled();
        expect(composer.generateThumbnail).toHaveBeenCalled();
      });

      it('should throw NotFoundException if video does not exist', async () => {
        mockPrismaService.video.findUnique.mockResolvedValue(null);

        await expect(service.generateVideo({ videoId: 'non-existent' })).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('with productId and script', () => {
      it('should create and generate new video', async () => {
        mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
        mockPrismaService.video.create.mockResolvedValue(mockVideo as any);
        mockPrismaService.video.update.mockResolvedValue(mockVideo as any);
        elevenLabs.generateVoice.mockResolvedValue('https://example.com/voice.mp3');
        pikaLabs.generateVideo.mockResolvedValue('https://example.com/visuals.mp4');
        composer.compose.mockResolvedValue('https://example.com/final.mp4');
        composer.generateThumbnail.mockResolvedValue('https://example.com/thumb.jpg');

        const result = await service.generateVideo({
          productId: 'prod-1',
          script: 'Test script',
        });

        expect(result).toBeDefined();
        expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
          where: { id: 'prod-1' },
        });
        expect(mockPrismaService.video.create).toHaveBeenCalled();
      });

      it('should throw NotFoundException if product does not exist', async () => {
        mockPrismaService.product.findUnique.mockResolvedValue(null);

        await expect(
          service.generateVideo({ productId: 'non-existent', script: 'test' }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('validation', () => {
      it('should throw error if neither videoId nor productId+script provided', async () => {
        await expect(service.generateVideo({})).rejects.toThrow(
          'Either videoId or (productId + script) must be provided',
        );
      });
    });

    describe('generation steps', () => {
      beforeEach(() => {
        mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
        mockPrismaService.video.create.mockResolvedValue(mockVideo as any);
        mockPrismaService.video.update.mockResolvedValue(mockVideo as any);
      });

      it('should update status to GENERATING before generation', async () => {
        elevenLabs.generateVoice.mockResolvedValue('https://example.com/voice.mp3');
        pikaLabs.generateVideo.mockResolvedValue('https://example.com/visuals.mp4');
        composer.compose.mockResolvedValue('https://example.com/final.mp4');
        composer.generateThumbnail.mockResolvedValue('https://example.com/thumb.jpg');

        await service.generateVideo({
          productId: 'prod-1',
          script: 'Test script',
        });

        expect(mockPrismaService.video.update).toHaveBeenCalledWith({
          where: { id: mockVideo.id },
          data: { status: 'GENERATING' },
        });
      });

      it('should generate voice with ElevenLabs', async () => {
        elevenLabs.generateVoice.mockResolvedValue('https://example.com/voice.mp3');
        pikaLabs.generateVideo.mockResolvedValue('https://example.com/visuals.mp4');
        composer.compose.mockResolvedValue('https://example.com/final.mp4');
        composer.generateThumbnail.mockResolvedValue('https://example.com/thumb.jpg');

        await service.generateVideo({
          productId: 'prod-1',
          script: 'Test script',
        });

        expect(elevenLabs.generateVoice).toHaveBeenCalledWith({
          text: mockVideo.script,
          voiceId: 'default',
        });
      });

      it('should generate visuals with PikaLabs', async () => {
        elevenLabs.generateVoice.mockResolvedValue('https://example.com/voice.mp3');
        pikaLabs.generateVideo.mockResolvedValue('https://example.com/visuals.mp4');
        composer.compose.mockResolvedValue('https://example.com/final.mp4');
        composer.generateThumbnail.mockResolvedValue('https://example.com/thumb.jpg');

        await service.generateVideo({
          productId: 'prod-1',
          script: 'Test script',
        });

        expect(pikaLabs.generateVideo).toHaveBeenCalledWith({
          prompt: expect.stringContaining('Test Product'),
          duration: mockVideo.duration,
        });
      });

      it('should compose final video', async () => {
        const voiceUrl = 'https://example.com/voice.mp3';
        const visualsUrl = 'https://example.com/visuals.mp4';

        elevenLabs.generateVoice.mockResolvedValue(voiceUrl);
        pikaLabs.generateVideo.mockResolvedValue(visualsUrl);
        composer.compose.mockResolvedValue('https://example.com/final.mp4');
        composer.generateThumbnail.mockResolvedValue('https://example.com/thumb.jpg');

        await service.generateVideo({
          productId: 'prod-1',
          script: 'Test script',
        });

        expect(composer.compose).toHaveBeenCalledWith({
          voiceUrl,
          visualsUrl,
          script: mockVideo.script,
          product: mockVideo.product,
        });
      });

      it('should generate thumbnail', async () => {
        const finalVideoUrl = 'https://example.com/final.mp4';

        elevenLabs.generateVoice.mockResolvedValue('https://example.com/voice.mp3');
        pikaLabs.generateVideo.mockResolvedValue('https://example.com/visuals.mp4');
        composer.compose.mockResolvedValue(finalVideoUrl);
        composer.generateThumbnail.mockResolvedValue('https://example.com/thumb.jpg');

        await service.generateVideo({
          productId: 'prod-1',
          script: 'Test script',
        });

        expect(composer.generateThumbnail).toHaveBeenCalledWith({
          videoUrl: finalVideoUrl,
          productTitle: mockProduct.title,
        });
      });

      it('should update video with all generated assets', async () => {
        const voiceUrl = 'https://example.com/voice.mp3';
        const finalVideoUrl = 'https://example.com/final.mp4';
        const thumbnailUrl = 'https://example.com/thumb.jpg';

        elevenLabs.generateVoice.mockResolvedValue(voiceUrl);
        pikaLabs.generateVideo.mockResolvedValue('https://example.com/visuals.mp4');
        composer.compose.mockResolvedValue(finalVideoUrl);
        composer.generateThumbnail.mockResolvedValue(thumbnailUrl);

        await service.generateVideo({
          productId: 'prod-1',
          script: 'Test script',
        });

        expect(mockPrismaService.video.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: mockVideo.id },
            data: expect.objectContaining({
              videoUrl: finalVideoUrl,
              voiceUrl: voiceUrl,
              thumbnailUrl: thumbnailUrl,
              status: 'READY',
              generatedAt: expect.any(Date),
            }),
          }),
        );
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
        mockPrismaService.video.create.mockResolvedValue(mockVideo as any);
        mockPrismaService.video.update.mockResolvedValue(mockVideo as any);
      });

      it('should update status to FAILED on error', async () => {
        elevenLabs.generateVoice.mockRejectedValue(new Error('Voice generation failed'));

        await expect(
          service.generateVideo({
            productId: 'prod-1',
            script: 'Test script',
          }),
        ).rejects.toThrow('Voice generation failed');

        expect(mockPrismaService.video.update).toHaveBeenCalledWith({
          where: { id: mockVideo.id },
          data: { status: 'FAILED' },
        });
      });

      it('should handle PikaLabs errors', async () => {
        elevenLabs.generateVoice.mockResolvedValue('https://example.com/voice.mp3');
        pikaLabs.generateVideo.mockRejectedValue(new Error('Pika generation failed'));

        await expect(
          service.generateVideo({
            productId: 'prod-1',
            script: 'Test script',
          }),
        ).rejects.toThrow('Pika generation failed');

        expect(mockPrismaService.video.update).toHaveBeenCalledWith({
          where: { id: mockVideo.id },
          data: { status: 'FAILED' },
        });
      });

      it('should handle composer errors', async () => {
        elevenLabs.generateVoice.mockResolvedValue('https://example.com/voice.mp3');
        pikaLabs.generateVideo.mockResolvedValue('https://example.com/visuals.mp4');
        composer.compose.mockRejectedValue(new Error('Composition failed'));

        await expect(
          service.generateVideo({
            productId: 'prod-1',
            script: 'Test script',
          }),
        ).rejects.toThrow('Composition failed');
      });

      it('should handle thumbnail generation errors', async () => {
        elevenLabs.generateVoice.mockResolvedValue('https://example.com/voice.mp3');
        pikaLabs.generateVideo.mockResolvedValue('https://example.com/visuals.mp4');
        composer.compose.mockResolvedValue('https://example.com/final.mp4');
        composer.generateThumbnail.mockRejectedValue(new Error('Thumbnail failed'));

        await expect(
          service.generateVideo({
            productId: 'prod-1',
            script: 'Test script',
          }),
        ).rejects.toThrow('Thumbnail failed');
      });
    });
  });

  describe('findById', () => {
    it('should find video by id with relations', async () => {
      const videoWithRelations = {
        ...mockVideo,
        publications: [
          {
            id: 'pub-1',
            platform: 'YOUTUBE',
            analytics: [],
          },
        ],
      };

      mockPrismaService.video.findUnique.mockResolvedValue(videoWithRelations as any);

      const result = await service.findById('video-1');

      expect(result).toEqual(videoWithRelations);
      expect(mockPrismaService.video.findUnique).toHaveBeenCalledWith({
        where: { id: 'video-1' },
        include: {
          product: true,
          publications: {
            include: {
              analytics: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if video not found', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByProduct', () => {
    it('should find all videos for a product', async () => {
      const mockVideos = [mockVideo, { ...mockVideo, id: 'video-2' }];
      mockPrismaService.video.findMany.mockResolvedValue(mockVideos as any);

      const result = await service.findByProduct('prod-1');

      expect(result).toEqual(mockVideos);
      expect(mockPrismaService.video.findMany).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no videos found', async () => {
      mockPrismaService.video.findMany.mockResolvedValue([]);

      const result = await service.findByProduct('prod-1');

      expect(result).toEqual([]);
    });
  });

  describe('regenerateVideo', () => {
    it('should regenerate existing video', async () => {
      const videoWithRelations = {
        ...mockVideo,
        publications: [],
      };

      mockPrismaService.video.findUnique.mockResolvedValue(videoWithRelations as any);
      mockPrismaService.video.update.mockResolvedValue(mockVideo as any);
      elevenLabs.generateVoice.mockResolvedValue('https://example.com/voice.mp3');
      pikaLabs.generateVideo.mockResolvedValue('https://example.com/visuals.mp4');
      composer.compose.mockResolvedValue('https://example.com/final.mp4');
      composer.generateThumbnail.mockResolvedValue('https://example.com/thumb.jpg');

      const result = await service.regenerateVideo('video-1');

      expect(result).toBeDefined();
      expect(mockPrismaService.video.findUnique).toHaveBeenCalled();
    });

    it('should throw NotFoundException if video does not exist', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue(null);

      await expect(service.regenerateVideo('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('console logging', () => {
    it('should log generation steps', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPrismaService.video.create.mockResolvedValue(mockVideo as any);
      mockPrismaService.video.update.mockResolvedValue(mockVideo as any);
      elevenLabs.generateVoice.mockResolvedValue('https://example.com/voice.mp3');
      pikaLabs.generateVideo.mockResolvedValue('https://example.com/visuals.mp4');
      composer.compose.mockResolvedValue('https://example.com/final.mp4');
      composer.generateThumbnail.mockResolvedValue('https://example.com/thumb.jpg');

      await service.generateVideo({
        productId: 'prod-1',
        script: 'Test script',
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Starting video generation'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Generating voice'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Generating visuals'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Composing final video'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Generating thumbnail'));
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Video generated successfully'),
      );

      consoleSpy.mockRestore();
    });

    it('should log errors during generation', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      mockPrismaService.video.create.mockResolvedValue(mockVideo as any);
      mockPrismaService.video.update.mockResolvedValue(mockVideo as any);
      elevenLabs.generateVoice.mockRejectedValue(new Error('Test error'));

      await expect(
        service.generateVideo({
          productId: 'prod-1',
          script: 'Test script',
        }),
      ).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Video generation failed'),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
