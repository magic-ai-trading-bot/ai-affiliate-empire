/**
 * Unit tests for ProductRanker service
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ProductRanker } from '@/modules/product/services/product-ranker.service';
import { TrendAggregatorService } from '@/modules/product/services/trend-aggregator.service';
import { createMockProduct, createMockProducts } from '../../fixtures/product.fixtures';

describe('ProductRanker', () => {
  let service: ProductRanker;
  let trendAggregator: jest.Mocked<TrendAggregatorService>;

  beforeEach(async () => {
    const mockTrendAggregator = {
      getTrendScores: jest.fn().mockResolvedValue({
        googleTrendScore: 0.7,
        twitterScore: 0.6,
        redditScore: 0.5,
        tiktokScore: 0.4,
        aggregatedScore: 0.55,
        source: ['google', 'reddit'],
        failedSources: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductRanker,
        {
          provide: TrendAggregatorService,
          useValue: mockTrendAggregator,
        },
      ],
    }).compile();

    service = module.get<ProductRanker>(ProductRanker);
    trendAggregator = module.get(TrendAggregatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateScores', () => {
    it('should calculate all score components', async () => {
      const product = createMockProduct({
        price: 100,
        commission: 10,
        category: 'Electronics',
        brand: 'Apple',
      });

      const scores = await service.calculateScores(product);

      expect(scores).toHaveProperty('trendScore');
      expect(scores).toHaveProperty('profitScore');
      expect(scores).toHaveProperty('viralityScore');
      expect(scores).toHaveProperty('overallScore');

      expect(scores.trendScore).toBeGreaterThanOrEqual(0);
      expect(scores.trendScore).toBeLessThanOrEqual(1);
      expect(scores.profitScore).toBeGreaterThanOrEqual(0);
      expect(scores.profitScore).toBeLessThanOrEqual(1);
      expect(scores.viralityScore).toBeGreaterThanOrEqual(0);
      expect(scores.viralityScore).toBeLessThanOrEqual(1);
    });

    it('should calculate overall score as weighted average', async () => {
      const product = createMockProduct({
        price: 100,
        commission: 10,
        category: 'Electronics',
      });

      const scores = await service.calculateScores(product);

      // Overall score should be weighted average
      const expectedOverall =
        scores.trendScore * 0.3 + scores.profitScore * 0.4 + scores.viralityScore * 0.3;

      expect(scores.overallScore).toBeCloseTo(expectedOverall, 2);
    });
  });

  describe('calculateProfitScore', () => {
    it('should return higher score for higher commission', async () => {
      const lowCommissionProduct = createMockProduct({
        price: 100,
        commission: 2, // 2% = $2 commission
      });

      const highCommissionProduct = createMockProduct({
        price: 100,
        commission: 10, // 10% = $10 commission
      });

      const lowScores = await service.calculateScores(lowCommissionProduct);
      const highScores = await service.calculateScores(highCommissionProduct);

      expect(highScores.profitScore).toBeGreaterThan(lowScores.profitScore);
    });

    it('should boost score for commission > 5%', async () => {
      const product = createMockProduct({
        price: 100,
        commission: 6,
      });

      const scores = await service.calculateScores(product);

      // Commission of 6% on $100 = $6
      // Base score: 6/10 = 0.6
      // Boost: +0.1
      // Expected: min(0.7, 1.0) = 0.7
      expect(scores.profitScore).toBeGreaterThanOrEqual(0.7);
    });

    it('should cap profit score at 1.0', async () => {
      const product = createMockProduct({
        price: 500,
        commission: 20, // $100 commission
      });

      const scores = await service.calculateScores(product);

      expect(scores.profitScore).toBeLessThanOrEqual(1.0);
    });

    it('should handle zero commission', async () => {
      const product = createMockProduct({
        price: 100,
        commission: 0,
      });

      const scores = await service.calculateScores(product);

      expect(scores.profitScore).toBe(0);
    });
  });

  describe('trend and virality integration', () => {
    it('should use TrendAggregator for trend scores', async () => {
      const product = createMockProduct();

      await service.calculateScores(product);

      expect(trendAggregator.getTrendScores).toHaveBeenCalledWith(product);
    });

    it('should use Google Trends score as trendScore', async () => {
      trendAggregator.getTrendScores.mockResolvedValue({
        googleTrendScore: 0.85,
        twitterScore: 0.6,
        redditScore: 0.5,
        tiktokScore: 0.4,
        aggregatedScore: 0.6,
        source: ['google'],
        failedSources: [],
      });

      const product = createMockProduct();
      const scores = await service.calculateScores(product);

      expect(scores.trendScore).toBe(0.85);
    });

    it('should use aggregated score as viralityScore', async () => {
      trendAggregator.getTrendScores.mockResolvedValue({
        googleTrendScore: 0.7,
        twitterScore: 0.8,
        redditScore: 0.6,
        tiktokScore: 0.5,
        aggregatedScore: 0.65,
        source: ['google', 'twitter'],
        failedSources: [],
      });

      const product = createMockProduct();
      const scores = await service.calculateScores(product);

      expect(scores.viralityScore).toBe(0.65);
    });

    it('should include trend sources in results', async () => {
      trendAggregator.getTrendScores.mockResolvedValue({
        googleTrendScore: 0.7,
        twitterScore: 0.6,
        redditScore: 0.5,
        tiktokScore: 0.4,
        aggregatedScore: 0.55,
        source: ['google', 'reddit', 'tiktok'],
        failedSources: ['twitter'],
      });

      const product = createMockProduct();
      const scores = await service.calculateScores(product);

      expect(scores.trendSources).toEqual(['google', 'reddit', 'tiktok']);
    });
  });

  describe('rankProducts', () => {
    it('should sort products by overall score descending', async () => {
      const products = createMockProducts(5);

      const ranked = await service.rankProducts(products);

      // Verify sorted in descending order
      for (let i = 0; i < ranked.length - 1; i++) {
        expect((ranked[i] as any).overallScore).toBeGreaterThanOrEqual(
          (ranked[i + 1] as any).overallScore,
        );
      }
    });

    it('should preserve all product properties', async () => {
      const products = createMockProducts(3);

      const ranked = await service.rankProducts(products);

      expect(ranked).toHaveLength(products.length);

      // Verify all original products are present (order may change due to ranking)
      const originalIds = products.map((p) => p.id);
      const rankedIds = ranked.map((p) => p.id);
      expect(rankedIds.sort()).toEqual(originalIds.sort());

      // Verify properties are preserved
      ranked.forEach((product) => {
        const original = products.find((p) => p.id === product.id);
        expect(product.title).toBe(original.title);
        expect(product.price).toBe(original.price);
      });
    });

    it('should add score properties to products', async () => {
      const products = createMockProducts(3);

      const ranked = await service.rankProducts(products);

      ranked.forEach((product: any) => {
        expect(product).toHaveProperty('trendScore');
        expect(product).toHaveProperty('profitScore');
        expect(product).toHaveProperty('viralityScore');
        expect(product).toHaveProperty('overallScore');
      });
    });

    it('should handle empty product array', async () => {
      const ranked = await service.rankProducts([]);

      expect(ranked).toEqual([]);
    });

    it('should handle single product', async () => {
      const product = createMockProduct();

      const ranked = await service.rankProducts([product]);

      expect(ranked).toHaveLength(1);
      expect(ranked[0].id).toBe(product.id);
    });
  });

  describe('edge cases', () => {
    it('should handle product with missing category', async () => {
      const product = createMockProduct({
        category: undefined,
      });

      const scores = await service.calculateScores(product);

      expect(scores.trendScore).toBeGreaterThanOrEqual(0);
      expect(scores.trendScore).toBeLessThanOrEqual(1);
    });

    it('should handle product with missing brand', async () => {
      const product = createMockProduct({
        brand: undefined,
      });

      const scores = await service.calculateScores(product);

      expect(scores.viralityScore).toBeGreaterThanOrEqual(0);
      expect(scores.viralityScore).toBeLessThanOrEqual(1);
    });

    it('should handle extreme prices', async () => {
      const cheapProduct = createMockProduct({
        price: 1,
        commission: 10,
      });

      const expensiveProduct = createMockProduct({
        price: 10000,
        commission: 10,
      });

      const cheapScores = await service.calculateScores(cheapProduct);
      const expensiveScores = await service.calculateScores(expensiveProduct);

      expect(cheapScores.profitScore).toBeLessThan(expensiveScores.profitScore);
    });
  });
});
