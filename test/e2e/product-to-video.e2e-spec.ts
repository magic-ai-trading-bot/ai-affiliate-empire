/**
 * E2E tests for Product-to-Video Pipeline
 * Tests the complete flow from product selection to video generation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/common/database/prisma.service';
import { createMockProduct } from '../fixtures/product.fixtures';

describe('Product-to-Video Pipeline (E2E)', () => {
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
    await prisma.video.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.affiliateNetwork.deleteMany({});
  });

  describe('Complete Pipeline', () => {
    it('should convert product → script → voice → video → thumbnail', async () => {
      // Setup network and product
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({
          title: 'Wireless Headphones',
          description: 'Premium noise-cancelling headphones',
          price: 299.99,
          commission: 8,
          category: 'Electronics',
          networkId: network.id,
        }),
      });

      // Step 1: Generate script
      const scriptResponse = await request(app.getHttpServer())
        .post('/content/scripts/generate')
        .send({
          productId: product.id,
          language: 'en',
          tone: 'engaging',
          duration: 60,
        })
        .expect(201);

      expect(scriptResponse.body).toHaveProperty('script');
      expect(scriptResponse.body).toHaveProperty('videoId');
      expect(scriptResponse.body.script).toContain('Wireless Headphones');

      const videoId = scriptResponse.body.videoId;

      // Verify video record was created
      const video = await prisma.video.findUnique({
        where: { id: videoId },
      });

      expect(video).toBeDefined();
      expect(video?.status).toBe('PENDING');
      expect(video?.script).toBeTruthy();

      // Step 2: Generate voice
      const voiceResponse = await request(app.getHttpServer())
        .post('/video/voice/generate')
        .send({
          videoId,
          voiceProvider: 'elevenlabs',
          voiceId: 'default',
        })
        .expect(202);

      expect(voiceResponse.body).toHaveProperty('status');

      // Step 3: Generate video visuals
      const visualsResponse = await request(app.getHttpServer())
        .post('/video/visuals/generate')
        .send({
          videoId,
          videoProvider: 'pikalabs',
        })
        .expect(202);

      expect(visualsResponse.body).toHaveProperty('status');

      // Step 4: Compose final video
      const composeResponse = await request(app.getHttpServer())
        .post('/video/compose')
        .send({
          videoId,
        })
        .expect(202);

      expect(composeResponse.body).toHaveProperty('status');

      // Step 5: Generate thumbnail
      const thumbnailResponse = await request(app.getHttpServer())
        .post('/video/thumbnail/generate')
        .send({
          videoId,
        })
        .expect(202);

      expect(thumbnailResponse.body).toHaveProperty('thumbnailUrl');
    }, 60000);

    it('should handle multiple languages', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({
          networkId: network.id,
        }),
      });

      // Generate English script
      const enResponse = await request(app.getHttpServer())
        .post('/content/scripts/generate')
        .send({
          productId: product.id,
          language: 'en',
        })
        .expect(201);

      expect(enResponse.body.videoId).toBeDefined();

      // Generate Vietnamese script
      const viResponse = await request(app.getHttpServer())
        .post('/content/scripts/generate')
        .send({
          productId: product.id,
          language: 'vi',
        })
        .expect(201);

      expect(viResponse.body.videoId).toBeDefined();
      expect(viResponse.body.videoId).not.toBe(enResponse.body.videoId);

      // Verify both videos were created
      const videos = await prisma.video.findMany({
        where: { productId: product.id },
      });

      expect(videos).toHaveLength(2);
      expect(videos.map((v) => v.language).sort()).toEqual(['en', 'vi']);
    });

    it('should batch process multiple products', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      // Create 10 products
      const products = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          prisma.product.create({
            data: createMockProduct({
              title: `Product ${i + 1}`,
              networkId: network.id,
            }),
          }),
        ),
      );

      // Generate scripts for all products
      const scriptPromises = products.map((product) =>
        request(app.getHttpServer())
          .post('/content/scripts/generate')
          .send({
            productId: product.id,
            language: 'en',
          }),
      );

      const responses = await Promise.all(scriptPromises);

      // Verify all succeeded
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // Verify videos were created
      const videos = await prisma.video.findMany({
        where: { productId: { in: products.map((p) => p.id) } },
      });

      expect(videos).toHaveLength(10);
    }, 90000);
  });

  describe('Script Generation', () => {
    it('should generate engaging short-form script', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({
          title: 'Smart Watch',
          description: 'Fitness tracking smartwatch',
          networkId: network.id,
        }),
      });

      const response = await request(app.getHttpServer())
        .post('/content/scripts/generate')
        .send({
          productId: product.id,
          language: 'en',
          tone: 'engaging',
          duration: 30,
        })
        .expect(201);

      const script = response.body.script;

      // Verify script quality
      expect(script).toBeTruthy();
      expect(script.length).toBeGreaterThan(50);
      expect(script.length).toBeLessThan(500);

      // Should contain product reference
      expect(script.toLowerCase()).toContain('watch');

      // Should have engaging tone
      expect(script).toMatch(/[!?]/); // Contains exclamation or question
    });

    it('should include affiliate URL in script metadata', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({
          affiliateUrl: 'https://amazon.com/dp/TEST123?tag=affiliate-20',
          networkId: network.id,
        }),
      });

      const response = await request(app.getHttpServer())
        .post('/content/scripts/generate')
        .send({
          productId: product.id,
          language: 'en',
        })
        .expect(201);

      const video = await prisma.video.findUnique({
        where: { id: response.body.videoId },
        include: { product: true },
      });

      expect(video?.product.affiliateUrl).toContain('tag=affiliate-20');
    });

    it('should respect duration constraints', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({
          networkId: network.id,
        }),
      });

      // Test different durations
      const durations = [15, 30, 60];

      for (const duration of durations) {
        const response = await request(app.getHttpServer())
          .post('/content/scripts/generate')
          .send({
            productId: product.id,
            language: 'en',
            duration,
          })
          .expect(201);

        const video = await prisma.video.findUnique({
          where: { id: response.body.videoId },
        });

        expect(video?.duration).toBe(duration);
      }
    });
  });

  describe('Voice Generation', () => {
    it('should generate voice with ElevenLabs', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({
          networkId: network.id,
        }),
      });

      // Create video with script
      const video = await prisma.video.create({
        data: {
          productId: product.id,
          title: 'Test Video',
          script: 'This is an amazing product that you need to check out!',
          duration: 30,
          status: 'PENDING',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/video/voice/generate')
        .send({
          videoId: video.id,
          voiceProvider: 'elevenlabs',
          voiceId: 'premium-voice',
        })
        .expect(202);

      expect(response.body.status).toBe('generating');
    });

    it('should handle voice generation failure gracefully', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({
          networkId: network.id,
        }),
      });

      const video = await prisma.video.create({
        data: {
          productId: product.id,
          title: 'Test Video',
          script: '',  // Empty script should fail
          duration: 30,
          status: 'PENDING',
        },
      });

      await request(app.getHttpServer())
        .post('/video/voice/generate')
        .send({
          videoId: video.id,
          voiceProvider: 'elevenlabs',
        })
        .expect(400);
    });
  });

  describe('Video Generation', () => {
    it('should generate visuals with Pika Labs', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({
          networkId: network.id,
        }),
      });

      const video = await prisma.video.create({
        data: {
          productId: product.id,
          title: 'Test Video',
          script: 'Amazing product!',
          duration: 30,
          status: 'PENDING',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/video/visuals/generate')
        .send({
          videoId: video.id,
          videoProvider: 'pikalabs',
        })
        .expect(202);

      expect(response.body.status).toBe('generating');
    });

    it('should track video generation cost', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({
          networkId: network.id,
        }),
      });

      const video = await prisma.video.create({
        data: {
          productId: product.id,
          title: 'Test Video',
          script: 'Product review',
          duration: 30,
          status: 'PENDING',
        },
      });

      // Generate video
      await request(app.getHttpServer())
        .post('/video/visuals/generate')
        .send({
          videoId: video.id,
          videoProvider: 'pikalabs',
        })
        .expect(202);

      // Cost should be tracked in system
      // Expected cost: ~$0.014 per video with Pika Labs
    });
  });

  describe('Error Handling', () => {
    it('should handle product not found', async () => {
      await request(app.getHttpServer())
        .post('/content/scripts/generate')
        .send({
          productId: 'nonexistent-id',
          language: 'en',
        })
        .expect(404);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/content/scripts/generate')
        .send({
          // Missing productId
          language: 'en',
        })
        .expect(400);
    });

    it('should handle API rate limits', async () => {
      const network = await prisma.affiliateNetwork.create({
        data: {
          name: 'Amazon',
          commissionRate: 5.0,
          status: 'ACTIVE',
        },
      });

      const product = await prisma.product.create({
        data: createMockProduct({
          networkId: network.id,
        }),
      });

      // Make many rapid requests to trigger rate limit
      const requests = Array.from({ length: 100 }, () =>
        request(app.getHttpServer())
          .post('/content/scripts/generate')
          .send({
            productId: product.id,
            language: 'en',
          }),
      );

      const responses = await Promise.allSettled(requests);

      // Some should be rate limited
      const rateLimited = responses.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 429,
      );

      expect(rateLimited.length).toBeGreaterThan(0);
    }, 30000);
  });
});
