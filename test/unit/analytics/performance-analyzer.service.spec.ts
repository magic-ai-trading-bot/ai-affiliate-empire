/**
 * Unit tests for PerformanceAnalyzerService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceAnalyzerService } from '@/modules/analytics/services/performance-analyzer.service';

describe('PerformanceAnalyzerService', () => {
  let service: PerformanceAnalyzerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceAnalyzerService],
    }).compile();

    service = module.get<PerformanceAnalyzerService>(PerformanceAnalyzerService);
  });

  describe('analyzeProduct', () => {
    it('should analyze product with complete data', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [
          { views: 1000, clicks: 50, conversions: 5, revenue: 50, date: new Date() },
          { views: 2000, clicks: 100, conversions: 10, revenue: 100, date: new Date() },
        ],
        videos: [
          {
            id: 'v1',
            title: 'Video 1',
            publications: [
              {
                platform: 'YOUTUBE',
                analytics: [{ views: 1000, likes: 50, comments: 10, shares: 5 }],
              },
            ],
          },
        ],
      };

      const result = service.analyzeProduct(product);

      expect(result).toHaveProperty('product');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('platforms');
      expect(result).toHaveProperty('recommendations');
    });

    it('should calculate total metrics correctly', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [
          { views: 1000, clicks: 50, conversions: 5, revenue: 50, date: new Date() },
          { views: 2000, clicks: 100, conversions: 10, revenue: 100, date: new Date() },
          { views: 500, clicks: 25, conversions: 2, revenue: 25, date: new Date() },
        ],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      expect(result.performance.views).toBe(3500);
      expect(result.performance.clicks).toBe(175);
      expect(result.performance.conversions).toBe(17);
      expect(result.performance.revenue).toBe(175);
    });

    it('should calculate CTR correctly', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [{ views: 10000, clicks: 200, conversions: 10, revenue: 100, date: new Date() }],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      // CTR = (200 / 10000) * 100 = 2%
      expect(result.performance.ctr).toBe(2);
    });

    it('should calculate conversion rate correctly', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [{ views: 10000, clicks: 200, conversions: 10, revenue: 100, date: new Date() }],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      // Conversion rate = (10 / 200) * 100 = 5%
      expect(result.performance.conversionRate).toBe(5);
    });

    it('should handle product with no analytics', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      expect(result.performance.views).toBe(0);
      expect(result.performance.clicks).toBe(0);
      expect(result.performance.conversions).toBe(0);
      expect(result.performance.revenue).toBe(0);
      expect(result.performance.ctr).toBe(0);
      expect(result.performance.conversionRate).toBe(0);
    });

    it('should handle product with no videos', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [{ views: 1000, clicks: 50, conversions: 5, revenue: 50, date: new Date() }],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      expect(result.content.totalVideos).toBe(0);
      expect(result.content.bestPerformer).toBeNull();
    });

    it('should handle undefined analytics and videos', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
      };

      const result = service.analyzeProduct(product);

      expect(result.performance.views).toBe(0);
      expect(result.content.totalVideos).toBe(0);
    });
  });

  describe('calculateTrend (private)', () => {
    it('should return neutral for insufficient data', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [{ views: 1000, clicks: 50, conversions: 5, revenue: 50, date: new Date() }],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      expect(result.trend.direction).toBe('neutral');
      expect(result.trend.percentage).toBe(0);
    });

    it('should detect upward trend', () => {
      const today = new Date();
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [
          // Recent 7 days - high revenue
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 100,
            date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 100,
            date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 100,
            date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 100,
            date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 100,
            date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 100,
            date: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 100,
            date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
          // Previous 7 days - low revenue
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 50,
            date: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 50,
            date: new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 50,
            date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 50,
            date: new Date(today.getTime() - 11 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 50,
            date: new Date(today.getTime() - 12 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 50,
            date: new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 50,
            date: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000),
          },
        ],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      expect(result.trend.direction).toBe('up');
      expect(result.trend.percentage).toBeGreaterThan(5);
    });

    it('should detect downward trend', () => {
      const today = new Date();
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [
          // Recent 7 days - low revenue
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 50,
            date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 50,
            date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 50,
            date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 50,
            date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 50,
            date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 50,
            date: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 50,
            date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
          // Previous 7 days - high revenue
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 100,
            date: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 100,
            date: new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 100,
            date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 100,
            date: new Date(today.getTime() - 11 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 100,
            date: new Date(today.getTime() - 12 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 100,
            date: new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 100,
            date: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000),
          },
        ],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      expect(result.trend.direction).toBe('down');
      expect(result.trend.percentage).toBeGreaterThan(5);
    });

    it('should return up when previous period has zero revenue', () => {
      const today = new Date();
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 100,
            date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
          },
          {
            views: 1000,
            clicks: 50,
            conversions: 5,
            revenue: 0,
            date: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000),
          },
        ],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      expect(result.trend.direction).toBe('up');
      expect(result.trend.percentage).toBe(100);
    });

    it('should include last updated date', () => {
      const lastDate = new Date('2024-01-15');
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [
          { views: 1000, clicks: 50, conversions: 5, revenue: 100, date: lastDate },
          { views: 1000, clicks: 50, conversions: 5, revenue: 50, date: new Date('2024-01-10') },
        ],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      expect(result.trend.lastUpdated).toEqual(lastDate);
    });
  });

  describe('findBestVideo (private)', () => {
    it('should find video with most views', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [],
        videos: [
          {
            id: 'v1',
            title: 'Video 1',
            publications: [
              {
                analytics: [{ views: 1000, likes: 50, comments: 10, shares: 5 }],
              },
            ],
          },
          {
            id: 'v2',
            title: 'Video 2',
            publications: [
              {
                analytics: [{ views: 5000, likes: 250, comments: 50, shares: 25 }],
              },
            ],
          },
          {
            id: 'v3',
            title: 'Video 3',
            publications: [
              {
                analytics: [{ views: 2000, likes: 100, comments: 20, shares: 10 }],
              },
            ],
          },
        ],
      };

      const result = service.analyzeProduct(product);

      expect(result.content.bestPerformer).toEqual({
        id: 'v2',
        title: 'Video 2',
        views: 5000,
      });
    });

    it('should return null for no videos', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      expect(result.content.bestPerformer).toBeNull();
    });

    it('should handle videos with no publications', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [],
        videos: [
          {
            id: 'v1',
            title: 'Video 1',
            publications: [],
          },
        ],
      };

      const result = service.analyzeProduct(product);

      expect(result.content.bestPerformer).toEqual({
        id: 'v1',
        title: 'Video 1',
        views: 0,
      });
    });

    it('should aggregate views across multiple publications', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [],
        videos: [
          {
            id: 'v1',
            title: 'Video 1',
            publications: [
              { analytics: [{ views: 1000 }, { views: 2000 }] },
              { analytics: [{ views: 3000 }] },
            ],
          },
        ],
      };

      const result = service.analyzeProduct(product);

      expect(result.content.bestPerformer).not.toBeNull();
      expect(result.content.bestPerformer?.views).toBe(6000);
    });
  });

  describe('analyzePlatformPerformance (private)', () => {
    it('should analyze performance by platform', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [],
        videos: [
          {
            id: 'v1',
            title: 'Video 1',
            publications: [
              {
                platform: 'YOUTUBE',
                analytics: [{ views: 1000, likes: 50, comments: 10, shares: 5 }],
              },
            ],
          },
          {
            id: 'v2',
            title: 'Video 2',
            publications: [
              {
                platform: 'TIKTOK',
                analytics: [{ views: 5000, likes: 250, comments: 50, shares: 25 }],
              },
            ],
          },
        ],
      };

      const result = service.analyzeProduct(product);

      expect(result.platforms).toHaveLength(2);
      expect(result.platforms[0]).toHaveProperty('platform');
      expect(result.platforms[0]).toHaveProperty('publications');
      expect(result.platforms[0]).toHaveProperty('views');
      expect(result.platforms[0]).toHaveProperty('engagement');
    });

    it('should aggregate metrics per platform', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [],
        videos: [
          {
            id: 'v1',
            title: 'Video 1',
            publications: [
              {
                platform: 'YOUTUBE',
                analytics: [{ views: 1000, likes: 50, comments: 10, shares: 5 }],
              },
            ],
          },
          {
            id: 'v2',
            title: 'Video 2',
            publications: [
              {
                platform: 'YOUTUBE',
                analytics: [{ views: 2000, likes: 100, comments: 20, shares: 10 }],
              },
            ],
          },
        ],
      };

      const result = service.analyzeProduct(product);

      const youtube = result.platforms.find((p: any) => p.platform === 'YOUTUBE');
      expect(youtube.publications).toBe(2);
      expect(youtube.views).toBe(3000);
      expect(youtube.engagement).toBe(195); // (50+10+5) + (100+20+10)
    });

    it('should calculate engagement correctly', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [],
        videos: [
          {
            id: 'v1',
            title: 'Video 1',
            publications: [
              {
                platform: 'YOUTUBE',
                analytics: [{ views: 1000, likes: 50, comments: 10, shares: 5 }],
              },
            ],
          },
        ],
      };

      const result = service.analyzeProduct(product);

      const youtube = result.platforms.find((p: any) => p.platform === 'YOUTUBE');
      expect(youtube.engagement).toBe(65); // 50 + 10 + 5
    });

    it('should handle videos with no publications', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [],
        videos: [
          {
            id: 'v1',
            title: 'Video 1',
            publications: [],
          },
        ],
      };

      const result = service.analyzeProduct(product);

      expect(result.platforms).toHaveLength(0);
    });
  });

  describe('generateRecommendations (private)', () => {
    it('should recommend thumbnail improvement for low CTR', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [{ views: 10000, clicks: 50, conversions: 5, revenue: 50, date: new Date() }],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      // CTR = 0.5%, should recommend improvement
      const hasLowCTR = result.recommendations.some((r: string) => r.includes('Low CTR detected'));
      expect(hasLowCTR).toBe(true);
    });

    it('should recommend CTA improvement for low conversion rate', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [
          { views: 10000, clicks: 1000, conversions: 10, revenue: 100, date: new Date() },
        ],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      // Conversion rate = 1%, should recommend improvement
      const hasLowConversion = result.recommendations.some((r: string) =>
        r.includes('Low conversion rate'),
      );
      expect(hasLowConversion).toBe(true);
    });

    it('should recommend higher commission products for low revenue', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [{ views: 10000, clicks: 100, conversions: 2, revenue: 5, date: new Date() }],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      const hasLowRevenue = result.recommendations.some((r: string) => r.includes('Low revenue'));
      expect(hasLowRevenue).toBe(true);
    });

    it('should recommend archiving for low product score', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.3,
        analytics: [{ views: 10000, clicks: 100, conversions: 5, revenue: 50, date: new Date() }],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      const hasLowScore = result.recommendations.some((r: string) =>
        r.includes('Low product score'),
      );
      expect(hasLowScore).toBe(true);
    });

    it('should recommend scaling for well-performing products', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.9,
        analytics: [{ views: 10000, clicks: 200, conversions: 10, revenue: 100, date: new Date() }],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      // High CTR (2%), high conversion rate (5%), high revenue
      const hasWellPerforming = result.recommendations.some((r: string) =>
        r.includes('performing well'),
      );
      expect(hasWellPerforming).toBe(true);
    });

    it('should provide multiple recommendations when needed', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.3,
        analytics: [{ views: 10000, clicks: 50, conversions: 1, revenue: 5, date: new Date() }],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      // Should have multiple recommendations: low CTR, low conversion, low revenue, low score
      expect(result.recommendations.length).toBeGreaterThan(1);
    });
  });

  describe('product data parsing', () => {
    it('should parse price as float', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: '99.99',
        commission: 10,
        overallScore: 0.85,
        analytics: [],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      expect(result.product.price).toBe(99.99);
      expect(typeof result.product.price).toBe('number');
    });

    it('should parse commission as float', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: '15.50',
        overallScore: 0.85,
        analytics: [],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      expect(result.product.commission).toBe(15.5);
      expect(typeof result.product.commission).toBe('number');
    });

    it('should include all product metadata', () => {
      const product = {
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
        analytics: [],
        videos: [],
      };

      const result = service.analyzeProduct(product);

      expect(result.product).toEqual({
        id: 'p1',
        title: 'Test Product',
        price: 100,
        commission: 10,
        overallScore: 0.85,
      });
    });
  });
});
