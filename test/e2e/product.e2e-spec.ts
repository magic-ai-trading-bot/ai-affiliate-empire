/**
 * E2E tests for Product API endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/common/database/prisma.service';
import { createMockProduct } from '../fixtures/product.fixtures';

describe('ProductController (E2E)', () => {
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

  afterEach(async () => {
    // Clean up test data
    await prisma.product.deleteMany({});
  });

  describe('GET /products', () => {
    it('should return ranked products', async () => {
      // Create test products
      await prisma.product.createMany({
        data: [
          createMockProduct({ title: 'Product 1', overallScore: 0.9 }),
          createMockProduct({ title: 'Product 2', overallScore: 0.8 }),
          createMockProduct({ title: 'Product 3', overallScore: 0.7 }),
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body[0].title).toBe('Product 1');

      // Verify sorted by score
      expect(response.body[0].overallScore).toBeGreaterThanOrEqual(
        response.body[1].overallScore,
      );
    });

    it('should limit results when limit parameter is provided', async () => {
      // Create test products
      await prisma.product.createMany({
        data: [
          createMockProduct({ title: 'Product 1' }),
          createMockProduct({ title: 'Product 2' }),
          createMockProduct({ title: 'Product 3' }),
          createMockProduct({ title: 'Product 4' }),
          createMockProduct({ title: 'Product 5' }),
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/products?limit=2')
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('should filter by category', async () => {
      // Create products in different categories
      await prisma.product.createMany({
        data: [
          createMockProduct({ title: 'Electronics 1', category: 'Electronics' }),
          createMockProduct({ title: 'Electronics 2', category: 'Electronics' }),
          createMockProduct({ title: 'Book 1', category: 'Books' }),
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/products?category=Electronics')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].category).toBe('Electronics');
      expect(response.body[1].category).toBe('Electronics');
    });

    it('should return empty array when no products exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /products/:id', () => {
    it('should return product by id', async () => {
      const product = await prisma.product.create({
        data: createMockProduct({ title: 'Test Product' }),
      });

      const response = await request(app.getHttpServer())
        .get(`/products/${product.id}`)
        .expect(200);

      expect(response.body.id).toBe(product.id);
      expect(response.body.title).toBe('Test Product');
    });

    it('should return 404 when product not found', async () => {
      await request(app.getHttpServer())
        .get('/products/nonexistent-id')
        .expect(404);
    });
  });

  describe('POST /products', () => {
    it('should create a new product', async () => {
      const productData = {
        title: 'New Product',
        description: 'Test description',
        price: 99.99,
        commission: 10,
        category: 'Electronics',
        affiliateUrl: 'https://amazon.com/test',
        networkId: 'network-1',
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .send(productData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(productData.title);
      expect(response.body.price).toBe(productData.price);

      // Verify product was created in database
      const dbProduct = await prisma.product.findUnique({
        where: { id: response.body.id },
      });

      expect(dbProduct).toBeDefined();
      expect(dbProduct?.title).toBe(productData.title);
    });

    it('should return 400 when required fields are missing', async () => {
      const invalidData = {
        title: 'Incomplete Product',
        // Missing required fields
      };

      await request(app.getHttpServer())
        .post('/products')
        .send(invalidData)
        .expect(400);
    });

    it('should validate commission percentage', async () => {
      const invalidData = {
        title: 'Product',
        description: 'Test',
        price: 100,
        commission: 150, // Invalid: > 100%
        category: 'Test',
        affiliateUrl: 'https://test.com',
        networkId: 'network-1',
      };

      await request(app.getHttpServer())
        .post('/products')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('POST /products/sync/amazon', () => {
    it('should sync products from Amazon', async () => {
      const response = await request(app.getHttpServer())
        .post('/products/sync/amazon')
        .send({ category: 'Electronics' })
        .expect(200);

      expect(response.body).toHaveProperty('synced');
      expect(response.body.synced).toBeGreaterThanOrEqual(0);
    });

    it('should sync products with keywords', async () => {
      const response = await request(app.getHttpServer())
        .post('/products/sync/amazon')
        .send({ keywords: 'wireless headphones' })
        .expect(200);

      expect(response.body).toHaveProperty('synced');
    });
  });

  describe('POST /products/:id/rank', () => {
    it('should rank an existing product', async () => {
      const product = await prisma.product.create({
        data: createMockProduct({ title: 'Test Product' }),
      });

      const response = await request(app.getHttpServer())
        .post(`/products/${product.id}/rank`)
        .expect(200);

      expect(response.body).toHaveProperty('trendScore');
      expect(response.body).toHaveProperty('profitScore');
      expect(response.body).toHaveProperty('viralityScore');
      expect(response.body).toHaveProperty('overallScore');

      // Verify scores are between 0 and 1
      expect(response.body.trendScore).toBeGreaterThanOrEqual(0);
      expect(response.body.trendScore).toBeLessThanOrEqual(1);
    });

    it('should return 404 when product not found', async () => {
      await request(app.getHttpServer())
        .post('/products/nonexistent-id/rank')
        .expect(404);
    });
  });

  describe('pagination and sorting', () => {
    it('should handle pagination correctly', async () => {
      // Create 20 products
      const products = Array.from({ length: 20 }, (_, i) =>
        createMockProduct({ title: `Product ${i}`, overallScore: Math.random() }),
      );

      await prisma.product.createMany({ data: products });

      // Get first page
      const page1 = await request(app.getHttpServer())
        .get('/products?limit=10&offset=0')
        .expect(200);

      expect(page1.body).toHaveLength(10);

      // Get second page
      const page2 = await request(app.getHttpServer())
        .get('/products?limit=10&offset=10')
        .expect(200);

      expect(page2.body).toHaveLength(10);

      // Verify no overlap
      const page1Ids = page1.body.map((p: any) => p.id);
      const page2Ids = page2.body.map((p: any) => p.id);
      const intersection = page1Ids.filter((id: string) => page2Ids.includes(id));

      expect(intersection).toHaveLength(0);
    });
  });
});
