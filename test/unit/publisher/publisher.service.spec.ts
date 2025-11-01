/**
 * Unit tests for PublisherService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PublisherService } from '@/modules/publisher/publisher.service';
import { PrismaService } from '@/common/database/prisma.service';
import { YoutubeService } from '@/modules/publisher/services/youtube.service';
import { TiktokService } from '@/modules/publisher/services/tiktok.service';
import { InstagramService } from '@/modules/publisher/services/instagram.service';
import { FtcDisclosureValidatorService } from '@/common/compliance/ftc-disclosure-validator.service';
import { MockPrismaService, mockPrismaService } from '../../mocks/prisma.mock';

describe('PublisherService', () => {
  let service: PublisherService;
  let _prisma: MockPrismaService;
  let youtube: jest.Mocked<YoutubeService>;
  let tiktok: jest.Mocked<TiktokService>;
  let instagram: jest.Mocked<InstagramService>;
  let ftcValidator: jest.Mocked<FtcDisclosureValidatorService>;

  const mockProduct = {
    id: 'prod-1',
    title: 'Test Product',
    description: 'Test description for the product',
    category: 'Electronics',
    brand: 'TestBrand',
  };

  const mockVideo = {
    id: 'video-1',
    productId: 'prod-1',
    title: 'Test Video',
    videoUrl: 'https://example.com/video.mp4',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    status: 'READY',
    product: mockProduct,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublisherService,
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
        {
          provide: YoutubeService,
          useValue: {
            uploadShort: jest.fn(),
          },
        },
        {
          provide: TiktokService,
          useValue: {
            uploadVideo: jest.fn(),
          },
        },
        {
          provide: InstagramService,
          useValue: {
            uploadReel: jest.fn(),
          },
        },
        {
          provide: FtcDisclosureValidatorService,
          useValue: {
            validateSocialCaption: jest.fn(),
            ensureDisclosure: jest.fn((caption) => caption + ' #ad'),
          },
        },
      ],
    }).compile();

    service = module.get<PublisherService>(PublisherService);
    prisma = module.get<MockPrismaService>(PrismaService);
    youtube = module.get(YoutubeService);
    tiktok = module.get(TiktokService);
    instagram = module.get(InstagramService);
    ftcValidator = module.get(FtcDisclosureValidatorService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('publishVideo', () => {
    it('should publish video to single platform', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrismaService.publication.create.mockResolvedValue({
        id: 'pub-1',
        status: 'PUBLISHING',
      } as any);
      mockPrismaService.publication.update.mockResolvedValue({
        id: 'pub-1',
        status: 'PUBLISHED',
      } as any);
      youtube.uploadShort.mockResolvedValue({
        videoId: 'yt-1',
        url: 'https://youtube.com/shorts/yt-1',
      } as any);

      const result = await service.publishVideo({
        videoId: 'video-1',
        platforms: ['YOUTUBE'],
      });

      expect(result.publications).toHaveLength(1);
      expect(youtube.uploadShort).toHaveBeenCalled();
    });

    it('should publish video to multiple platforms', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrismaService.publication.create.mockResolvedValue({ id: 'pub-1' } as any);
      mockPrismaService.publication.update.mockResolvedValue({ id: 'pub-1' } as any);
      ftcValidator.validateSocialCaption.mockReturnValue({ isValid: true } as any);

      youtube.uploadShort.mockResolvedValue({
        videoId: 'yt-1',
        url: 'https://youtube.com/yt-1',
      } as any);
      tiktok.uploadVideo.mockResolvedValue({
        videoId: 'tt-1',
        url: 'https://tiktok.com/tt-1',
      } as any);
      instagram.uploadReel.mockResolvedValue({
        mediaId: 'ig-1',
        url: 'https://instagram.com/ig-1',
      } as any);

      const result = await service.publishVideo({
        videoId: 'video-1',
        platforms: ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'],
      });

      expect(result.publications).toHaveLength(3);
      expect(youtube.uploadShort).toHaveBeenCalled();
      expect(tiktok.uploadVideo).toHaveBeenCalled();
      expect(instagram.uploadReel).toHaveBeenCalled();
    });

    it('should throw NotFoundException if video not found', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue(null);

      await expect(
        service.publishVideo({
          videoId: 'non-existent',
          platforms: ['YOUTUBE'],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if video not ready', async () => {
      const pendingVideo = { ...mockVideo, status: 'PENDING' };
      mockPrismaService.video.findUnique.mockResolvedValue(pendingVideo as any);

      await expect(
        service.publishVideo({
          videoId: 'video-1',
          platforms: ['YOUTUBE'],
        }),
      ).rejects.toThrow('Video is not ready for publishing');
    });

    it('should use custom caption and hashtags if provided', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrismaService.publication.create.mockResolvedValue({ id: 'pub-1' } as any);
      mockPrismaService.publication.update.mockResolvedValue({ id: 'pub-1' } as any);
      youtube.uploadShort.mockResolvedValue({
        videoId: 'yt-1',
        url: 'https://youtube.com/yt-1',
      } as any);

      await service.publishVideo({
        videoId: 'video-1',
        platforms: ['YOUTUBE'],
        caption: 'Custom caption',
        hashtags: '#custom #tags',
      });

      expect(mockPrismaService.publication.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          caption: 'Custom caption',
          hashtags: '#custom #tags',
        }),
      });
    });

    it('should generate caption and hashtags if not provided', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrismaService.publication.create.mockResolvedValue({ id: 'pub-1' } as any);
      mockPrismaService.publication.update.mockResolvedValue({ id: 'pub-1' } as any);
      youtube.uploadShort.mockResolvedValue({
        videoId: 'yt-1',
        url: 'https://youtube.com/yt-1',
      } as any);

      await service.publishVideo({
        videoId: 'video-1',
        platforms: ['YOUTUBE'],
      });

      expect(youtube.uploadShort).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Test Product'),
        }),
      );
    });

    it('should validate FTC compliance for TikTok', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrismaService.publication.create.mockResolvedValue({ id: 'pub-1' } as any);
      mockPrismaService.publication.update.mockResolvedValue({ id: 'pub-1' } as any);
      ftcValidator.validateSocialCaption.mockReturnValue({ isValid: true } as any);
      tiktok.uploadVideo.mockResolvedValue({
        videoId: 'tt-1',
        url: 'https://tiktok.com/tt-1',
      } as any);

      await service.publishVideo({
        videoId: 'video-1',
        platforms: ['TIKTOK'],
      });

      expect(ftcValidator.validateSocialCaption).toHaveBeenCalledWith(expect.any(String), 'tiktok');
    });

    it('should add FTC disclosure if missing for TikTok', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrismaService.publication.create.mockResolvedValue({ id: 'pub-1' } as any);
      mockPrismaService.publication.update.mockResolvedValue({ id: 'pub-1' } as any);
      ftcValidator.validateSocialCaption.mockReturnValue({ isValid: false } as any);
      tiktok.uploadVideo.mockResolvedValue({
        videoId: 'tt-1',
        url: 'https://tiktok.com/tt-1',
      } as any);

      await service.publishVideo({
        videoId: 'video-1',
        platforms: ['TIKTOK'],
      });

      expect(ftcValidator.ensureDisclosure).toHaveBeenCalled();
    });

    it('should validate FTC compliance for Instagram', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrismaService.publication.create.mockResolvedValue({ id: 'pub-1' } as any);
      mockPrismaService.publication.update.mockResolvedValue({ id: 'pub-1' } as any);
      ftcValidator.validateSocialCaption.mockReturnValue({ isValid: true } as any);
      instagram.uploadReel.mockResolvedValue({
        mediaId: 'ig-1',
        url: 'https://instagram.com/ig-1',
      } as any);

      await service.publishVideo({
        videoId: 'video-1',
        platforms: ['INSTAGRAM'],
      });

      expect(ftcValidator.validateSocialCaption).toHaveBeenCalledWith(
        expect.any(String),
        'instagram',
      );
    });

    it('should create failed publication on error', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrismaService.publication.create.mockResolvedValue({
        id: 'pub-1',
        status: 'FAILED',
        errorMessage: 'Upload failed',
      } as any);
      youtube.uploadShort.mockRejectedValue(new Error('Upload failed'));

      const result = await service.publishVideo({
        videoId: 'video-1',
        platforms: ['YOUTUBE'],
      });

      expect(result.publications[0].status).toBe('FAILED');
      expect(result.publications[0].errorMessage).toBe('Upload failed');
    });

    it('should continue publishing to other platforms on error', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrismaService.publication.create
        .mockResolvedValueOnce({
          id: 'pub-1',
          status: 'FAILED',
          errorMessage: 'YouTube failed',
        } as any)
        .mockResolvedValueOnce({ id: 'pub-2' } as any);
      mockPrismaService.publication.update.mockResolvedValue({ id: 'pub-2' } as any);
      youtube.uploadShort.mockRejectedValue(new Error('YouTube failed'));
      tiktok.uploadVideo.mockResolvedValue({
        videoId: 'tt-1',
        url: 'https://tiktok.com/tt-1',
      } as any);
      ftcValidator.validateSocialCaption.mockReturnValue({ isValid: true } as any);

      const result = await service.publishVideo({
        videoId: 'video-1',
        platforms: ['YOUTUBE', 'TIKTOK'],
      });

      expect(result.publications).toHaveLength(2);
      expect(result.publications[0].status).toBe('FAILED');
    });
  });

  describe('platform-specific publishing', () => {
    beforeEach(() => {
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrismaService.publication.create.mockResolvedValue({ id: 'pub-1', retryCount: 0 } as any);
      mockPrismaService.publication.update.mockResolvedValue({ id: 'pub-1', retryCount: 0 } as any);
    });

    it('should upload to YouTube', async () => {
      youtube.uploadShort.mockResolvedValue({
        videoId: 'yt-1',
        url: 'https://youtube.com/shorts/yt-1',
      } as any);

      await service.publishVideo({
        videoId: 'video-1',
        platforms: ['YOUTUBE'],
      });

      expect(youtube.uploadShort).toHaveBeenCalledWith({
        videoUrl: mockVideo.videoUrl,
        title: mockVideo.title,
        description: expect.any(String),
        thumbnailUrl: mockVideo.thumbnailUrl,
      });
    });

    it('should upload to TikTok with caption and hashtags', async () => {
      ftcValidator.validateSocialCaption.mockReturnValue({ isValid: true } as any);
      tiktok.uploadVideo.mockResolvedValue({
        videoId: 'tt-1',
        url: 'https://tiktok.com/tt-1',
      } as any);

      await service.publishVideo({
        videoId: 'video-1',
        platforms: ['TIKTOK'],
        caption: 'Test caption',
        hashtags: '#test',
      });

      expect(tiktok.uploadVideo).toHaveBeenCalledWith({
        videoUrl: mockVideo.videoUrl,
        caption: 'Test caption #test',
      });
    });

    it('should upload to Instagram with caption and hashtags', async () => {
      ftcValidator.validateSocialCaption.mockReturnValue({ isValid: true } as any);
      instagram.uploadReel.mockResolvedValue({
        mediaId: 'ig-1',
        url: 'https://instagram.com/ig-1',
      } as any);

      await service.publishVideo({
        videoId: 'video-1',
        platforms: ['INSTAGRAM'],
        caption: 'Test caption',
        hashtags: '#test',
      });

      expect(instagram.uploadReel).toHaveBeenCalledWith({
        videoUrl: mockVideo.videoUrl,
        caption: 'Test caption #test',
      });
    });

    it('should update publication status on success', async () => {
      youtube.uploadShort.mockResolvedValue({
        videoId: 'yt-1',
        url: 'https://youtube.com/yt-1',
      } as any);

      await service.publishVideo({
        videoId: 'video-1',
        platforms: ['YOUTUBE'],
      });

      expect(mockPrismaService.publication.update).toHaveBeenCalledWith({
        where: { id: 'pub-1' },
        data: expect.objectContaining({
          platformPostId: 'yt-1',
          url: 'https://youtube.com/yt-1',
          status: 'PUBLISHED',
          publishedAt: expect.any(Date),
        }),
      });
    });

    it('should update publication with error on failure', async () => {
      youtube.uploadShort.mockRejectedValue(new Error('Upload failed'));

      await service.publishVideo({
        videoId: 'video-1',
        platforms: ['YOUTUBE'],
      });

      expect(mockPrismaService.publication.update).toHaveBeenCalledWith({
        where: { id: 'pub-1' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Upload failed',
          retryCount: 1,
        }),
      });
    });
  });

  describe('getPublication', () => {
    it('should get publication by id with relations', async () => {
      const mockPublication = {
        id: 'pub-1',
        video: mockVideo,
        analytics: [],
      };
      mockPrismaService.publication.findUnique.mockResolvedValue(mockPublication as any);

      const result = await service.getPublication('pub-1');

      expect(result).toEqual(mockPublication);
      expect(mockPrismaService.publication.findUnique).toHaveBeenCalledWith({
        where: { id: 'pub-1' },
        include: {
          video: {
            include: {
              product: true,
            },
          },
          analytics: true,
        },
      });
    });

    it('should throw NotFoundException if publication not found', async () => {
      mockPrismaService.publication.findUnique.mockResolvedValue(null);

      await expect(service.getPublication('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPublicationsByVideo', () => {
    it('should get all publications for a video', async () => {
      const mockPublications = [
        { id: 'pub-1', platform: 'YOUTUBE' },
        { id: 'pub-2', platform: 'TIKTOK' },
      ];
      mockPrismaService.publication.findMany.mockResolvedValue(mockPublications as any);

      const result = await service.getPublicationsByVideo('video-1');

      expect(result).toEqual(mockPublications);
      expect(mockPrismaService.publication.findMany).toHaveBeenCalledWith({
        where: { videoId: 'video-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no publications found', async () => {
      mockPrismaService.publication.findMany.mockResolvedValue([]);

      const result = await service.getPublicationsByVideo('video-1');

      expect(result).toEqual([]);
    });
  });

  describe('retryPublication', () => {
    it('should retry failed publication', async () => {
      const failedPublication = {
        id: 'pub-1',
        status: 'FAILED',
        retryCount: 1,
        platform: 'YOUTUBE',
        caption: 'Test caption',
        hashtags: '#test',
        video: mockVideo,
      };
      mockPrismaService.publication.findUnique.mockResolvedValue(failedPublication as any);
      mockPrismaService.publication.create.mockResolvedValue({ id: 'pub-2' } as any);
      mockPrismaService.publication.update.mockResolvedValue({ id: 'pub-2' } as any);
      youtube.uploadShort.mockResolvedValue({
        videoId: 'yt-1',
        url: 'https://youtube.com/yt-1',
      } as any);

      await service.retryPublication('pub-1');

      expect(youtube.uploadShort).toHaveBeenCalled();
    });

    it('should throw error if publication already published', async () => {
      const publishedPublication = {
        id: 'pub-1',
        status: 'PUBLISHED',
        video: mockVideo,
      };
      mockPrismaService.publication.findUnique.mockResolvedValue(publishedPublication as any);

      await expect(service.retryPublication('pub-1')).rejects.toThrow(
        'Publication already published successfully',
      );
    });

    it('should throw error if max retries reached', async () => {
      const maxRetriesPublication = {
        id: 'pub-1',
        status: 'FAILED',
        retryCount: 3,
        video: mockVideo,
      };
      mockPrismaService.publication.findUnique.mockResolvedValue(maxRetriesPublication as any);

      await expect(service.retryPublication('pub-1')).rejects.toThrow(
        'Maximum retry attempts reached',
      );
    });
  });

  describe('caption generation', () => {
    it('should generate caption with product details', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrismaService.publication.create.mockResolvedValue({ id: 'pub-1' } as any);
      mockPrismaService.publication.update.mockResolvedValue({ id: 'pub-1' } as any);
      youtube.uploadShort.mockResolvedValue({
        videoId: 'yt-1',
        url: 'https://youtube.com/yt-1',
      } as any);

      await service.publishVideo({
        videoId: 'video-1',
        platforms: ['YOUTUBE'],
      });

      const description = youtube.uploadShort.mock.calls[0][0].description;
      expect(description).toContain(mockProduct.title);
      expect(description).toContain('#ad');
      expect(description).toContain('#affiliate');
    });

    it('should generate hashtags with category', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrismaService.publication.create.mockResolvedValue({ id: 'pub-1' } as any);
      mockPrismaService.publication.update.mockResolvedValue({ id: 'pub-1' } as any);
      ftcValidator.validateSocialCaption.mockReturnValue({ isValid: true } as any);
      tiktok.uploadVideo.mockResolvedValue({
        videoId: 'tt-1',
        url: 'https://tiktok.com/tt-1',
      } as any);

      await service.publishVideo({
        videoId: 'video-1',
        platforms: ['TIKTOK'],
      });

      const caption = tiktok.uploadVideo.mock.calls[0][0].caption;
      expect(caption).toMatch(/#electronics/i);
      expect(caption).toContain('#affiliate');
    });

    it('should include brand in hashtags if available', async () => {
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrismaService.publication.create.mockResolvedValue({ id: 'pub-1' } as any);
      mockPrismaService.publication.update.mockResolvedValue({ id: 'pub-1' } as any);
      ftcValidator.validateSocialCaption.mockReturnValue({ isValid: true } as any);
      tiktok.uploadVideo.mockResolvedValue({
        videoId: 'tt-1',
        url: 'https://tiktok.com/tt-1',
      } as any);

      await service.publishVideo({
        videoId: 'video-1',
        platforms: ['TIKTOK'],
      });

      const caption = tiktok.uploadVideo.mock.calls[0][0].caption;
      expect(caption).toMatch(/#testbrand/i);
    });
  });

  describe('console logging', () => {
    it('should log publishing process', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrismaService.publication.create.mockResolvedValue({ id: 'pub-1' } as any);
      mockPrismaService.publication.update.mockResolvedValue({ id: 'pub-1' } as any);
      youtube.uploadShort.mockResolvedValue({
        videoId: 'yt-1',
        url: 'https://youtube.com/yt-1',
      } as any);

      await service.publishVideo({
        videoId: 'video-1',
        platforms: ['YOUTUBE'],
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Publishing video to'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Published to YOUTUBE'));

      consoleSpy.mockRestore();
    });

    it('should log errors during publishing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo as any);
      mockPrismaService.publication.create.mockResolvedValue({ id: 'pub-1' } as any);
      youtube.uploadShort.mockRejectedValue(new Error('Upload failed'));

      await service.publishVideo({
        videoId: 'video-1',
        platforms: ['YOUTUBE'],
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error publishing to YOUTUBE'),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log retry attempts', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const failedPublication = {
        id: 'pub-1',
        status: 'FAILED',
        retryCount: 1,
        platform: 'YOUTUBE',
        caption: '',
        hashtags: '',
        video: mockVideo,
      };
      mockPrismaService.publication.findUnique.mockResolvedValue(failedPublication as any);
      mockPrismaService.publication.create.mockResolvedValue({ id: 'pub-2' } as any);
      mockPrismaService.publication.update.mockResolvedValue({ id: 'pub-2' } as any);
      youtube.uploadShort.mockResolvedValue({
        videoId: 'yt-1',
        url: 'https://youtube.com/yt-1',
      } as any);

      await service.retryPublication('pub-1');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Retrying publication'));

      consoleSpy.mockRestore();
    });
  });
});
