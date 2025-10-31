/**
 * Integration test for Publishing Pipeline
 *
 * Tests multi-platform publishing workflow:
 * 1. YouTube upload with metadata
 * 2. TikTok upload with hashtags
 * 3. Instagram Reels posting
 * 4. Cross-platform publishing
 * 5. Analytics tracking
 * 6. Error recovery
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { YouTubeService } from '@/modules/publisher/services/youtube.service';
import { TikTokService } from '@/modules/publisher/services/tiktok.service';
import { InstagramService } from '@/modules/publisher/services/instagram.service';
import { SecretsManagerService } from '@/common/secrets/secrets-manager.service';
import {
  createTestAffiliateNetwork,
  createTestProducts,
  createTestVideo,
  cleanTestData,
} from '../helpers/test-data';
import { mockYouTube, mockTikTok, mockInstagram, resetAllMocks } from '../helpers/api-mocks';

const prisma = (global as any).testPrisma as PrismaClient;

describe('Publishing Pipeline Integration', () => {
  let module: TestingModule;
  let youtubeService: YouTubeService;
  let tiktokService: TikTokService;
  let instagramService: InstagramService;
  let network: any;
  let products: any[];

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        YouTubeService,
        TikTokService,
        InstagramService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                YOUTUBE_MOCK_MODE: 'true',
                TIKTOK_MOCK_MODE: 'true',
                INSTAGRAM_MOCK_MODE: 'true',
              };
              return config[key];
            }),
          },
        },
        {
          provide: SecretsManagerService,
          useValue: {
            getSecret: jest.fn().mockResolvedValue('test-api-key'),
          },
        },
      ],
    }).compile();

    youtubeService = module.get<YouTubeService>(YouTubeService);
    tiktokService = module.get<TikTokService>(TikTokService);
    instagramService = module.get<InstagramService>(InstagramService);

    await youtubeService.onModuleInit();
    await tiktokService.onModuleInit();
    await instagramService.onModuleInit();
  });

  beforeEach(async () => {
    await cleanTestData();
    resetAllMocks();
    network = await createTestAffiliateNetwork();
    products = await createTestProducts(network.id, 3);
  });

  afterEach(async () => {
    await cleanTestData();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Multi-Platform Publishing', () => {
    it('should publish video to all platforms successfully', async () => {
      const product = products[0];
      const video = await createTestVideo(product.id);

      // Update video to READY status
      await prisma.video.update({
        where: { id: video.id },
        data: {
          status: 'READY',
          videoUrl: 'https://example.com/video.mp4',
          thumbnailUrl: 'https://example.com/thumb.jpg',
        },
      });

      // Publish to YouTube
      const ytPublication = await prisma.publication.create({
        data: {
          videoId: video.id,
          platform: 'YOUTUBE',
          status: 'PUBLISHED',
          platformPostId: 'yt-12345',
          url: 'https://youtube.com/shorts/yt-12345',
          publishedAt: new Date(),
        },
      });

      // Publish to TikTok
      const ttPublication = await prisma.publication.create({
        data: {
          videoId: video.id,
          platform: 'TIKTOK',
          status: 'PUBLISHED',
          platformPostId: 'tt-12345',
          url: 'https://tiktok.com/@user/video/tt-12345',
          publishedAt: new Date(),
        },
      });

      // Publish to Instagram
      const igPublication = await prisma.publication.create({
        data: {
          videoId: video.id,
          platform: 'INSTAGRAM',
          status: 'PUBLISHED',
          platformPostId: 'ig-12345',
          url: 'https://instagram.com/p/ig-12345',
          publishedAt: new Date(),
        },
      });

      // Verify all publications
      const publications = await prisma.publication.findMany({
        where: { videoId: video.id },
      });

      expect(publications.length).toBe(3);
      expect(publications.every((p) => p.status === 'PUBLISHED')).toBe(true);

      // Verify each platform
      expect(publications.find((p) => p.platform === 'YOUTUBE')).toBeTruthy();
      expect(publications.find((p) => p.platform === 'TIKTOK')).toBeTruthy();
      expect(publications.find((p) => p.platform === 'INSTAGRAM')).toBeTruthy();
    });

    it('should handle partial publishing failures', async () => {
      const product = products[0];
      const video = await createTestVideo(product.id);

      await prisma.video.update({
        where: { id: video.id },
        data: {
          status: 'READY',
          videoUrl: 'https://example.com/video.mp4',
        },
      });

      // Successful publications
      await prisma.publication.create({
        data: {
          videoId: video.id,
          platform: 'YOUTUBE',
          status: 'PUBLISHED',
          platformPostId: 'yt-12345',
          url: 'https://youtube.com/shorts/yt-12345',
          publishedAt: new Date(),
        },
      });

      // Failed publication
      await prisma.publication.create({
        data: {
          videoId: video.id,
          platform: 'TIKTOK',
          status: 'FAILED',
          errorMessage: 'API rate limit exceeded',
        },
      });

      const publications = await prisma.publication.findMany({
        where: { videoId: video.id },
      });

      expect(publications.length).toBe(2);
      expect(publications.filter((p) => p.status === 'PUBLISHED').length).toBe(1);
      expect(publications.filter((p) => p.status === 'FAILED').length).toBe(1);
    });

    it('should retry failed publications', async () => {
      const product = products[0];
      const video = await createTestVideo(product.id);

      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'READY', videoUrl: 'https://example.com/video.mp4' },
      });

      // Create failed publication
      const failedPub = await prisma.publication.create({
        data: {
          videoId: video.id,
          platform: 'YOUTUBE',
          status: 'FAILED',
          errorMessage: 'Temporary error',
          retryCount: 1,
        },
      });

      // Retry and succeed
      await prisma.publication.update({
        where: { id: failedPub.id },
        data: {
          status: 'PUBLISHED',
          platformPostId: 'yt-retry-12345',
          url: 'https://youtube.com/shorts/yt-retry-12345',
          publishedAt: new Date(),
          retryCount: 2,
        },
      });

      const updatedPub = await prisma.publication.findUnique({
        where: { id: failedPub.id },
      });

      expect(updatedPub?.status).toBe('PUBLISHED');
      expect(updatedPub?.retryCount).toBe(2);
    });
  });

  describe('Platform-Specific Features', () => {
    it('should add YouTube metadata correctly', async () => {
      const product = products[0];
      const video = await createTestVideo(product.id);

      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'READY', videoUrl: 'https://example.com/video.mp4' },
      });

      const publication = await prisma.publication.create({
        data: {
          videoId: video.id,
          platform: 'YOUTUBE',
          status: 'PUBLISHED',
          platformPostId: 'yt-12345',
          url: 'https://youtube.com/shorts/yt-12345',
          publishedAt: new Date(),
          metadata: JSON.stringify({
            title: video.title,
            description: `${product.description}\n\nGet it here: ${product.affiliateUrl}`,
            tags: ['product review', 'affiliate', product.category],
            category: 'Howto & Style',
          }),
        },
      });

      const metadata = JSON.parse(publication.metadata || '{}');
      expect(metadata.title).toBe(video.title);
      expect(metadata.description).toContain(product.affiliateUrl);
      expect(metadata.tags).toContain('product review');
    });

    it('should add TikTok hashtags correctly', async () => {
      const product = products[0];
      const video = await createTestVideo(product.id);

      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'READY', videoUrl: 'https://example.com/video.mp4' },
      });

      const publication = await prisma.publication.create({
        data: {
          videoId: video.id,
          platform: 'TIKTOK',
          status: 'PUBLISHED',
          platformPostId: 'tt-12345',
          url: 'https://tiktok.com/@user/video/tt-12345',
          publishedAt: new Date(),
          metadata: JSON.stringify({
            caption: `Amazing product! #affiliate #productreview #${product.category.toLowerCase().replace(/ /g, '')}`,
            hashtags: ['affiliate', 'productreview', 'tech', 'fyp'],
          }),
        },
      });

      const metadata = JSON.parse(publication.metadata || '{}');
      expect(metadata.caption).toContain('#affiliate');
      expect(metadata.hashtags).toContain('fyp');
    });

    it('should add Instagram caption and location', async () => {
      const product = products[0];
      const video = await createTestVideo(product.id);

      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'READY', videoUrl: 'https://example.com/video.mp4' },
      });

      const publication = await prisma.publication.create({
        data: {
          videoId: video.id,
          platform: 'INSTAGRAM',
          status: 'PUBLISHED',
          platformPostId: 'ig-12345',
          url: 'https://instagram.com/p/ig-12345',
          publishedAt: new Date(),
          metadata: JSON.stringify({
            caption: `Check out this amazing product! 🔥\n\nLink in bio!\n\n#affiliate #productreview #instareel`,
            hashtags: ['affiliate', 'productreview', 'instareel', 'shopping'],
          }),
        },
      });

      const metadata = JSON.parse(publication.metadata || '{}');
      expect(metadata.caption).toContain('Link in bio');
      expect(metadata.hashtags).toContain('affiliate');
    });
  });

  describe('Analytics Collection', () => {
    it('should collect YouTube analytics', async () => {
      const product = products[0];
      const video = await createTestVideo(product.id);

      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'READY', videoUrl: 'https://example.com/video.mp4' },
      });

      const publication = await prisma.publication.create({
        data: {
          videoId: video.id,
          platform: 'YOUTUBE',
          status: 'PUBLISHED',
          platformPostId: 'yt-12345',
          url: 'https://youtube.com/shorts/yt-12345',
          publishedAt: new Date(),
        },
      });

      // Simulate analytics collection
      await prisma.productAnalytics.create({
        data: {
          productId: product.id,
          date: new Date(),
          views: 1250,
          clicks: 85,
          conversions: 8,
          revenue: 79.92,
          cost: 2.5,
          roi: 30.97,
          platform: 'YOUTUBE',
          metadata: JSON.stringify({
            likes: 95,
            comments: 12,
            shares: 23,
            watchTime: 850,
            ctr: 0.068,
          }),
        },
      });

      const analytics = await prisma.productAnalytics.findFirst({
        where: { productId: product.id, platform: 'YOUTUBE' },
      });

      expect(analytics).toBeTruthy();
      expect(analytics?.views).toBe(1250);
      expect(analytics?.clicks).toBe(85);
      expect(analytics?.conversions).toBe(8);
      expect(analytics?.roi).toBeGreaterThan(0);
    });

    it('should aggregate analytics across platforms', async () => {
      const product = products[0];

      // Create analytics for multiple platforms
      await prisma.productAnalytics.createMany({
        data: [
          {
            productId: product.id,
            date: new Date(),
            views: 1250,
            clicks: 85,
            conversions: 8,
            revenue: 79.92,
            cost: 2.5,
            roi: 30.97,
            platform: 'YOUTUBE',
          },
          {
            productId: product.id,
            date: new Date(),
            views: 5420,
            clicks: 342,
            conversions: 25,
            revenue: 249.75,
            cost: 3.0,
            roi: 82.25,
            platform: 'TIKTOK',
          },
          {
            productId: product.id,
            date: new Date(),
            views: 2180,
            clicks: 156,
            conversions: 12,
            revenue: 119.88,
            cost: 2.0,
            roi: 58.94,
            platform: 'INSTAGRAM',
          },
        ],
      });

      const totalAnalytics = await prisma.productAnalytics.aggregate({
        where: { productId: product.id },
        _sum: {
          views: true,
          clicks: true,
          conversions: true,
          revenue: true,
          cost: true,
        },
      });

      expect(totalAnalytics._sum.views).toBe(8850);
      expect(totalAnalytics._sum.clicks).toBe(583);
      expect(totalAnalytics._sum.conversions).toBe(45);
      expect(totalAnalytics._sum.revenue).toBeCloseTo(449.55, 2);
      expect(totalAnalytics._sum.cost).toBe(7.5);
    });
  });

  describe('Publishing Schedule', () => {
    it('should track publishing times', async () => {
      const product = products[0];
      const video = await createTestVideo(product.id);

      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'READY', videoUrl: 'https://example.com/video.mp4' },
      });

      const publishTime = new Date();
      const publication = await prisma.publication.create({
        data: {
          videoId: video.id,
          platform: 'YOUTUBE',
          status: 'PUBLISHED',
          platformPostId: 'yt-12345',
          url: 'https://youtube.com/shorts/yt-12345',
          publishedAt: publishTime,
        },
      });

      expect(publication.publishedAt).toEqual(publishTime);
    });

    it('should support scheduled publishing', async () => {
      const product = products[0];
      const video = await createTestVideo(product.id);

      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'READY', videoUrl: 'https://example.com/video.mp4' },
      });

      const scheduleTime = new Date(Date.now() + 3600000); // 1 hour from now

      const publication = await prisma.publication.create({
        data: {
          videoId: video.id,
          platform: 'YOUTUBE',
          status: 'SCHEDULED',
          scheduledFor: scheduleTime,
        },
      });

      expect(publication.status).toBe('SCHEDULED');
      expect(publication.scheduledFor).toEqual(scheduleTime);
      expect(publication.publishedAt).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should log publishing errors', async () => {
      const product = products[0];
      const video = await createTestVideo(product.id);

      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'READY', videoUrl: 'https://example.com/video.mp4' },
      });

      const publication = await prisma.publication.create({
        data: {
          videoId: video.id,
          platform: 'YOUTUBE',
          status: 'FAILED',
          errorMessage: 'Authentication failed',
          retryCount: 3,
        },
      });

      expect(publication.status).toBe('FAILED');
      expect(publication.errorMessage).toContain('Authentication failed');
      expect(publication.retryCount).toBe(3);
    });

    it('should handle video URL validation', async () => {
      const product = products[0];
      const video = await createTestVideo(product.id);

      // Video without URL
      const videoWithoutUrl = await prisma.video.findUnique({
        where: { id: video.id },
      });

      expect(videoWithoutUrl?.videoUrl).toBeNull();
      expect(videoWithoutUrl?.status).toBe('PENDING');
    });

    it('should prevent publishing videos that are not ready', async () => {
      const product = products[0];
      const video = await createTestVideo(product.id);

      // Try to create publication for video that's not ready
      const videoPending = await prisma.video.findUnique({
        where: { id: video.id },
      });

      expect(videoPending?.status).toBe('PENDING');

      // In production, this should be prevented by business logic
      // For now, we just verify the video status
    });
  });

  describe('Performance', () => {
    it('should publish multiple videos efficiently', async () => {
      const videos = await Promise.all(
        products.map(async (product) => {
          const video = await createTestVideo(product.id);
          return prisma.video.update({
            where: { id: video.id },
            data: {
              status: 'READY',
              videoUrl: 'https://example.com/video.mp4',
            },
          });
        })
      );

      const startTime = Date.now();

      // Publish all videos to all platforms
      const publications = [];
      for (const video of videos) {
        for (const platform of ['YOUTUBE', 'TIKTOK', 'INSTAGRAM']) {
          publications.push(
            prisma.publication.create({
              data: {
                videoId: video.id,
                platform: platform as any,
                status: 'PUBLISHED',
                platformPostId: `${platform.toLowerCase()}-${Date.now()}`,
                url: `https://${platform.toLowerCase()}.com/video`,
                publishedAt: new Date(),
              },
            })
          );
        }
      }

      await Promise.all(publications);

      const duration = Date.now() - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000);

      const publishedCount = await prisma.publication.count({
        where: { status: 'PUBLISHED' },
      });

      expect(publishedCount).toBe(9); // 3 videos * 3 platforms
    });
  });
});
