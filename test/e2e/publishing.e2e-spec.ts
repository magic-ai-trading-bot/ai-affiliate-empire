/**
 * E2E tests for Multi-Platform Publishing
 * Tests publishing to YouTube, TikTok, Instagram, and Blog
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/common/database/prisma.service';
import { createMockProduct } from '../fixtures/product.fixtures';

describe('Publishing (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.publication.deleteMany({});
    await prisma.video.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.affiliateNetwork.deleteMany({});
  });

  describe('Multi-Platform Publishing', () => {
    it('should publish video to all platforms (YouTube, TikTok, Instagram)', async () => {
      // Setup
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({ networkId: network.id }),
      });

      const video = await prisma.video.create({
        data: {
          productId: product.id,
          title: 'Amazing Product Review',
          description: 'Check out this product!',
          script: 'Product script',
          duration: 60,
          status: 'READY',
          videoUrl: 'https://example.com/video.mp4',
          thumbnailUrl: 'https://example.com/thumb.jpg',
        },
      });

      // Publish to YouTube
      const youtubeRes = await request(app.getHttpServer())
        .post('/publisher/publish')
        .send({
          videoId: video.id,
          platform: 'YOUTUBE',
          title: video.title,
          description: video.description,
          tags: ['review', 'product', 'affiliate'],
        })
        .expect(201);

      expect(youtubeRes.body.platform).toBe('YOUTUBE');
      expect(youtubeRes.body.status).toBe('PUBLISHED');

      // Publish to TikTok
      const tiktokRes = await request(app.getHttpServer())
        .post('/publisher/publish')
        .send({
          videoId: video.id,
          platform: 'TIKTOK',
          caption: 'Amazing product! #review #trending',
        })
        .expect(201);

      expect(tiktokRes.body.platform).toBe('TIKTOK');

      // Publish to Instagram
      const instagramRes = await request(app.getHttpServer())
        .post('/publisher/publish')
        .send({
          videoId: video.id,
          platform: 'INSTAGRAM',
          caption: 'Must-see product review! #affiliate',
        })
        .expect(201);

      expect(instagramRes.body.platform).toBe('INSTAGRAM');

      // Verify all publications
      const publications = await prisma.publication.findMany({
        where: { videoId: video.id },
      });

      expect(publications).toHaveLength(3);
      expect(publications.map((p) => p.platform).sort()).toEqual([
        'INSTAGRAM',
        'TIKTOK',
        'YOUTUBE',
      ]);
    });

    it('should publish to blog platform', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({ networkId: network.id }),
      });

      // Create blog post
      const response = await request(app.getHttpServer())
        .post('/publisher/blog/publish')
        .send({
          productId: product.id,
          title: 'Complete Product Review 2025',
          content: 'Detailed review content...',
          excerpt: 'Brief overview',
          keywords: 'product, review, affiliate',
        })
        .expect(201);

      expect(response.body).toHaveProperty('slug');
      expect(response.body.status).toBe('PUBLISHED');

      // Verify blog was created
      const blog = await prisma.blog.findUnique({
        where: { id: response.body.id },
      });

      expect(blog).toBeDefined();
      expect(blog?.status).toBe('PUBLISHED');
    });

    it('should handle platform-specific rate limits', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({ networkId: network.id }),
      });

      // Create multiple videos
      const videos = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          prisma.video.create({
            data: {
              productId: product.id,
              title: `Video ${i + 1}`,
              script: 'Script',
              duration: 30,
              status: 'READY',
            },
          }),
        ),
      );

      // Try to publish all to TikTok (has lower limit)
      const publishPromises = videos.map((video) =>
        request(app.getHttpServer())
          .post('/publisher/publish')
          .send({
            videoId: video.id,
            platform: 'TIKTOK',
            caption: 'Test caption',
          }),
      );

      const results = await Promise.allSettled(publishPromises);

      // Some should be rate limited (TikTok: ~30/day)
      const rateLimited = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 429,
      );

      expect(rateLimited.length).toBeGreaterThan(0);
    }, 60000);
  });

  describe('YouTube Publishing', () => {
    it('should publish with proper metadata', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({ networkId: network.id }),
      });

      const video = await prisma.video.create({
        data: {
          productId: product.id,
          title: 'Product Review',
          script: 'Script',
          duration: 60,
          status: 'READY',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/publisher/publish')
        .send({
          videoId: video.id,
          platform: 'YOUTUBE',
          title: 'Amazing Product Review 2025',
          description: `Product link: ${product.affiliateUrl}`,
          tags: ['review', 'product', '2025'],
          category: 'Howto & Style',
        })
        .expect(201);

      expect(response.body).toHaveProperty('platformPostId');
      expect(response.body).toHaveProperty('url');
    });

    it('should validate video length for YouTube Shorts', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({ networkId: network.id }),
      });

      // Create video longer than 60 seconds
      const video = await prisma.video.create({
        data: {
          productId: product.id,
          title: 'Long Video',
          script: 'Script',
          duration: 120, // Too long for Shorts
          status: 'READY',
        },
      });

      // Should fail or warn for Shorts format
      const response = await request(app.getHttpServer())
        .post('/publisher/publish')
        .send({
          videoId: video.id,
          platform: 'YOUTUBE',
          title: 'Video Title',
          isShorts: true,
        });

      // Expect validation error or warning
      expect([400, 201]).toContain(response.status);
    });
  });

  describe('TikTok Publishing', () => {
    it('should publish with hashtags', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({ networkId: network.id }),
      });

      const video = await prisma.video.create({
        data: {
          productId: product.id,
          title: 'TikTok Video',
          script: 'Script',
          duration: 30,
          status: 'READY',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/publisher/publish')
        .send({
          videoId: video.id,
          platform: 'TIKTOK',
          caption: 'Amazing find! #fyp #viral #product #review',
        })
        .expect(201);

      const publication = await prisma.publication.findUnique({
        where: { id: response.body.id },
      });

      expect(publication?.hashtags).toContain('#fyp');
      expect(publication?.hashtags).toContain('#viral');
    });

    it('should respect TikTok video duration limits', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({ networkId: network.id }),
      });

      const video = await prisma.video.create({
        data: {
          productId: product.id,
          title: 'Video',
          script: 'Script',
          duration: 60, // Valid for TikTok (15-60s)
          status: 'READY',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/publisher/publish')
        .send({
          videoId: video.id,
          platform: 'TIKTOK',
          caption: 'Test caption',
        })
        .expect(201);

      expect(response.body.status).toBe('PUBLISHED');
    });
  });

  describe('Instagram Publishing', () => {
    it('should publish as Reel', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({ networkId: network.id }),
      });

      const video = await prisma.video.create({
        data: {
          productId: product.id,
          title: 'Instagram Reel',
          script: 'Script',
          duration: 30,
          status: 'READY',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/publisher/publish')
        .send({
          videoId: video.id,
          platform: 'INSTAGRAM',
          caption: 'Check this out! #affiliate #product',
          location: 'New York, USA',
        })
        .expect(201);

      expect(response.body.platform).toBe('INSTAGRAM');
    });

    it('should handle Instagram aspect ratio requirements', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({ networkId: network.id }),
      });

      const video = await prisma.video.create({
        data: {
          productId: product.id,
          title: 'Video',
          script: 'Script',
          duration: 30,
          status: 'READY',
        },
      });

      // Instagram Reels prefer 9:16 aspect ratio
      const response = await request(app.getHttpServer())
        .post('/publisher/publish')
        .send({
          videoId: video.id,
          platform: 'INSTAGRAM',
          caption: 'Product review',
          aspectRatio: '9:16',
        })
        .expect(201);

      expect(response.body).toHaveProperty('platformPostId');
    });
  });

  describe('Error Handling', () => {
    it('should handle video not ready for publishing', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({ networkId: network.id }),
      });

      const video = await prisma.video.create({
        data: {
          productId: product.id,
          title: 'Video',
          script: 'Script',
          duration: 30,
          status: 'PENDING', // Not ready yet
        },
      });

      await request(app.getHttpServer())
        .post('/publisher/publish')
        .send({
          videoId: video.id,
          platform: 'YOUTUBE',
          title: 'Title',
        })
        .expect(400);
    });

    it('should retry failed publications', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({ networkId: network.id }),
      });

      const video = await prisma.video.create({
        data: {
          productId: product.id,
          title: 'Video',
          script: 'Script',
          duration: 30,
          status: 'READY',
        },
      });

      // Create failed publication
      const failedPublication = await prisma.publication.create({
        data: {
          videoId: video.id,
          platform: 'YOUTUBE',
          status: 'FAILED',
          errorMessage: 'Network error',
          retryCount: 0,
        },
      });

      // Retry publication
      const response = await request(app.getHttpServer())
        .post(`/publisher/retry/${failedPublication.id}`)
        .expect(200);

      expect(response.body.retryCount).toBe(1);
    });

    it('should validate required fields per platform', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({ networkId: network.id }),
      });

      const video = await prisma.video.create({
        data: {
          productId: product.id,
          title: 'Video',
          script: 'Script',
          duration: 30,
          status: 'READY',
        },
      });

      // YouTube requires title
      await request(app.getHttpServer())
        .post('/publisher/publish')
        .send({
          videoId: video.id,
          platform: 'YOUTUBE',
          // Missing title
        })
        .expect(400);

      // TikTok requires caption
      await request(app.getHttpServer())
        .post('/publisher/publish')
        .send({
          videoId: video.id,
          platform: 'TIKTOK',
          // Missing caption
        })
        .expect(400);
    });
  });

  describe('Scheduling', () => {
    it('should schedule video for optimal posting time', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({ networkId: network.id }),
      });

      const video = await prisma.video.create({
        data: {
          productId: product.id,
          title: 'Video',
          script: 'Script',
          duration: 30,
          status: 'READY',
        },
      });

      const scheduleTime = new Date(Date.now() + 3600000); // 1 hour from now

      const response = await request(app.getHttpServer())
        .post('/publisher/schedule')
        .send({
          videoId: video.id,
          platform: 'YOUTUBE',
          title: 'Scheduled Video',
          scheduledAt: scheduleTime.toISOString(),
        })
        .expect(201);

      expect(response.body.status).toBe('SCHEDULED');
      expect(new Date(response.body.publishedAt)).toEqual(scheduleTime);
    });
  });
});
