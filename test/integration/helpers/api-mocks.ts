/**
 * Mock helpers for external APIs used in integration tests
 */

import { jest } from '@jest/globals';

/**
 * Mock OpenAI API responses
 */
export const mockOpenAI = {
  generateText: jest.fn<any, any>().mockResolvedValue({
    text: `Check out this amazing product! 🔥

Here's why you need it:
✅ Premium quality
✅ Great value
✅ Highly rated

Link in bio! #affiliate #product #review`,
    cost: {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      estimatedCost: 0.0015,
    },
  }),

  generateScript: jest.fn<any, any>().mockResolvedValue({
    text: `Scene 1: Hook
[Exciting music]
"You won't believe this amazing product!"

Scene 2: Problem
"Tired of [common problem]?"

Scene 3: Solution
"This product solves it perfectly!"

Scene 4: CTA
"Link in bio! Get yours now!"`,
    cost: {
      promptTokens: 150,
      completionTokens: 100,
      totalTokens: 250,
      estimatedCost: 0.0025,
    },
  }),
};

/**
 * Mock Claude API responses
 */
export const mockClaude = {
  generateText: jest.fn<any, any>().mockResolvedValue({
    text: `# Amazing Product Review

## Introduction
This product has been making waves in the market, and for good reason.

## Key Features
- Feature 1: Outstanding quality
- Feature 2: Excellent value
- Feature 3: User-friendly design

## Verdict
Highly recommended! Check it out using our affiliate link.

## Pros and Cons
**Pros:**
- Great quality
- Affordable price

**Cons:**
- Limited availability

[Affiliate Link]`,
    cost: {
      inputTokens: 200,
      outputTokens: 300,
      totalTokens: 500,
      estimatedCost: 0.004,
    },
  }),

  generateBlogPost: jest.fn<any, any>().mockResolvedValue({
    text: `# Comprehensive Product Review

Lorem ipsum dolor sit amet...`,
    cost: {
      inputTokens: 300,
      outputTokens: 800,
      totalTokens: 1100,
      estimatedCost: 0.009,
    },
  }),
};

/**
 * Mock ElevenLabs API responses
 */
export const mockElevenLabs = {
  generateVoiceover: jest.fn<any, any>().mockResolvedValue({
    audioUrl: 'https://api.elevenlabs.io/v1/audio/mock-audio-id',
    duration: 45,
    cost: 0.15,
  }),

  synthesizeSpeech: jest.fn<any, any>().mockResolvedValue({
    audioBuffer: Buffer.from('mock-audio-data'),
    duration: 30,
  }),
};

/**
 * Mock Pika Labs API responses
 */
export const mockPikaLabs = {
  generateVideo: jest.fn<any, any>().mockResolvedValue({
    videoId: 'mock-video-id-12345',
    status: 'processing',
  }),

  checkStatus: jest.fn<any, any>().mockResolvedValue({
    videoId: 'mock-video-id-12345',
    status: 'completed',
    videoUrl: 'https://cdn.pikalabs.ai/videos/mock-video-12345.mp4',
    thumbnailUrl: 'https://cdn.pikalabs.ai/thumbs/mock-video-12345.jpg',
    duration: 60,
  }),

  downloadVideo: jest.fn<any, any>().mockResolvedValue({
    buffer: Buffer.from('mock-video-data'),
    mimeType: 'video/mp4',
  }),
};

/**
 * Mock YouTube API responses
 */
export const mockYouTube = {
  uploadVideo: jest.fn<any, any>().mockResolvedValue({
    videoId: 'mock-yt-video-id',
    url: 'https://youtube.com/shorts/mock-yt-video-id',
    status: 'published',
  }),

  updateMetadata: jest.fn<any, any>().mockResolvedValue({
    success: true,
  }),

  getAnalytics: jest.fn<any, any>().mockResolvedValue({
    views: 1250,
    likes: 85,
    comments: 12,
    shares: 23,
    watchTime: 850,
    ctr: 0.068,
  }),
};

/**
 * Mock TikTok API responses
 */
export const mockTikTok = {
  uploadVideo: jest.fn<any, any>().mockResolvedValue({
    videoId: 'mock-tt-video-id',
    url: 'https://tiktok.com/@username/video/mock-tt-video-id',
    status: 'published',
  }),

  getAnalytics: jest.fn<any, any>().mockResolvedValue({
    views: 5420,
    likes: 342,
    comments: 48,
    shares: 67,
    engagement: 0.084,
  }),
};

/**
 * Mock Instagram API responses
 */
export const mockInstagram = {
  uploadReel: jest.fn<any, any>().mockResolvedValue({
    mediaId: 'mock-ig-media-id',
    url: 'https://instagram.com/p/mock-ig-media-id',
    status: 'published',
  }),

  getAnalytics: jest.fn<any, any>().mockResolvedValue({
    views: 2180,
    likes: 156,
    comments: 24,
    shares: 31,
    saves: 42,
    reach: 2850,
  }),
};

/**
 * Mock Amazon Product API responses
 */
export const mockAmazon = {
  searchProducts: jest.fn<any, any>().mockResolvedValue({
    products: [
      {
        asin: 'B08N5WRWNW',
        title: 'Apple AirPods Pro (2nd Generation)',
        price: 249.99,
        currency: 'USD',
        rating: 4.7,
        reviewCount: 125000,
        imageUrl: 'https://m.media-amazon.com/images/I/61SUj2aKoEL.jpg',
        category: 'Electronics',
        brand: 'Apple',
        affiliateUrl: 'https://www.amazon.com/dp/B08N5WRWNW?tag=affiliate-20',
      },
      {
        asin: 'B0BSHF7LLL',
        title: 'Amazon Echo Dot (5th Gen)',
        price: 49.99,
        currency: 'USD',
        rating: 4.6,
        reviewCount: 45000,
        imageUrl: 'https://m.media-amazon.com/images/I/71h5J5gzBJL.jpg',
        category: 'Electronics',
        brand: 'Amazon',
        affiliateUrl: 'https://www.amazon.com/dp/B0BSHF7LLL?tag=affiliate-20',
      },
    ],
    totalResults: 2,
  }),

  getProductDetails: jest.fn<any, any>().mockResolvedValue({
    asin: 'B08N5WRWNW',
    title: 'Apple AirPods Pro (2nd Generation)',
    description: 'Active Noise Cancellation, Adaptive Transparency, Personalized Spatial Audio',
    price: 249.99,
    currency: 'USD',
    rating: 4.7,
    reviewCount: 125000,
    imageUrl: 'https://m.media-amazon.com/images/I/61SUj2aKoEL.jpg',
    images: [
      'https://m.media-amazon.com/images/I/61SUj2aKoEL.jpg',
      'https://m.media-amazon.com/images/I/51MLAeqUyvL.jpg',
    ],
    category: 'Electronics > Headphones',
    brand: 'Apple',
    features: [
      'Active Noise Cancellation',
      'Adaptive Transparency',
      'Personalized Spatial Audio',
      'Up to 6 hours listening time',
    ],
    affiliateUrl: 'https://www.amazon.com/dp/B08N5WRWNW?tag=affiliate-20',
  }),
};

/**
 * Reset all mocks
 */
export function resetAllMocks() {
  Object.values(mockOpenAI).forEach((mock: any) => mock.mockClear());
  Object.values(mockClaude).forEach((mock: any) => mock.mockClear());
  Object.values(mockElevenLabs).forEach((mock: any) => mock.mockClear());
  Object.values(mockPikaLabs).forEach((mock: any) => mock.mockClear());
  Object.values(mockYouTube).forEach((mock: any) => mock.mockClear());
  Object.values(mockTikTok).forEach((mock: any) => mock.mockClear());
  Object.values(mockInstagram).forEach((mock: any) => mock.mockClear());
  Object.values(mockAmazon).forEach((mock: any) => mock.mockClear());
}
