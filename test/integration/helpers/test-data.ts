/**
 * Test data helpers for integration tests
 */

import { PrismaClient } from '@prisma/client';

const prisma = (global as any).testPrisma as PrismaClient;

/**
 * Create test affiliate network
 */
export async function createTestAffiliateNetwork() {
  return await prisma.affiliateNetwork.create({
    data: {
      name: 'Amazon Associates',
      apiUrl: 'https://api.amazon.com',
      apiKey: 'test-api-key',
      secretKey: 'test-secret-key',
      commissionRate: 5.0,
      status: 'ACTIVE',
    },
  });
}

/**
 * Create test products
 */
export async function createTestProducts(networkId: string, count: number = 5) {
  const products = [];

  for (let i = 0; i < count; i++) {
    const product = await prisma.product.create({
      data: {
        networkId,
        asin: `TEST${i.toString().padStart(7, '0')}`,
        title: `Test Product ${i + 1}`,
        description: `This is a test product description for product ${i + 1}`,
        price: 99.99 + i * 50,
        currency: 'USD',
        commission: 5 + i * 2,
        commissionType: 'percentage',
        category: i % 2 === 0 ? 'Electronics' : 'Home & Kitchen',
        brand: `Brand ${i % 3}`,
        imageUrl: `https://example.com/image${i}.jpg`,
        affiliateUrl: `https://amazon.com/dp/TEST${i.toString().padStart(7, '0')}?tag=test-20`,
        status: 'ACTIVE',
        trendScore: 0.5 + i * 0.1,
        profitScore: 0.6 + i * 0.08,
        viralityScore: 0.4 + i * 0.12,
        overallScore: 0.5 + i * 0.1,
        lastRankedAt: new Date(),
      },
    });
    products.push(product);
  }

  return products;
}

/**
 * Create test video for product
 */
export async function createTestVideo(productId: string) {
  return await prisma.video.create({
    data: {
      productId,
      title: 'Amazing Product Review',
      script: `Scene 1: Hook
"Check out this amazing product!"

Scene 2: Features
"It has these great features..."

Scene 3: CTA
"Get yours now!"`,
      duration: 60,
      language: 'en',
      status: 'PENDING',
    },
  });
}

/**
 * Create test blog post
 */
export async function createTestBlog(productId: string) {
  return await prisma.blog.create({
    data: {
      productId,
      title: 'Comprehensive Product Review',
      content: '# Product Review\n\nThis is a comprehensive review...',
      excerpt: 'This is a comprehensive review of the product',
      slug: `product-review-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      language: 'en',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      metaTitle: 'Product Review',
      metaDescription: 'A comprehensive review',
      keywords: 'product, review',
    },
  });
}

/**
 * Create test publication
 */
export async function createTestPublication(videoId: string, platform: string) {
  return await prisma.publication.create({
    data: {
      videoId,
      platform: platform as any,
      status: 'PUBLISHED',
      platformPostId: `mock-${platform.toLowerCase()}-${Date.now()}`,
      url: `https://${platform.toLowerCase()}.com/video/mock-id`,
      publishedAt: new Date(),
    },
  });
}

/**
 * Create test analytics
 */
export async function createTestAnalytics(productId: string) {
  return await prisma.productAnalytics.create({
    data: {
      productId,
      date: new Date(),
      views: 1000,
      clicks: 50,
      conversions: 5,
      revenue: 49.95,
      ctr: 5.0,
      conversionRate: 10.0,
      roi: 18.98,
    },
  });
}

/**
 * Create test workflow log
 */
export async function createTestWorkflowLog(status: string = 'COMPLETED') {
  return await prisma.workflowLog.create({
    data: {
      workflowId: `test-workflow-${Date.now()}`,
      workflowType: 'daily_control_loop',
      status: status as any,
      startedAt: new Date(Date.now() - 60000),
      completedAt: new Date(),
      duration: 60,
      result: JSON.stringify({
        productsProcessed: 5,
        videosGenerated: 5,
        videosPublished: 15,
      }),
    },
  });
}

/**
 * Create complete test workflow data
 */
export async function createCompleteTestWorkflowData() {
  // Create network
  const network = await createTestAffiliateNetwork();

  // Create products
  const products = await createTestProducts(network.id, 3);

  // Create videos for each product
  const videos = await Promise.all(products.map((product) => createTestVideo(product.id)));

  // Create blogs for each product
  const blogs = await Promise.all(products.map((product) => createTestBlog(product.id)));

  // Create publications for each video
  const publications = [];
  for (const video of videos) {
    publications.push(await createTestPublication(video.id, 'YOUTUBE'));
    publications.push(await createTestPublication(video.id, 'TIKTOK'));
    publications.push(await createTestPublication(video.id, 'INSTAGRAM'));
  }

  // Create analytics for each product
  const analytics = await Promise.all(products.map((product) => createTestAnalytics(product.id)));

  return {
    network,
    products,
    videos,
    blogs,
    publications,
    analytics,
  };
}

/**
 * Clean all test data
 */
export async function cleanTestData() {
  await prisma.platformAnalytics.deleteMany({});
  await prisma.publication.deleteMany({});
  await prisma.productAnalytics.deleteMany({});
  await prisma.networkAnalytics.deleteMany({});
  await prisma.workflowLog.deleteMany({});
  await prisma.video.deleteMany({});
  await prisma.blog.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.affiliateNetwork.deleteMany({});
}
