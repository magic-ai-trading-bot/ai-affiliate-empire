/**
 * Unit tests for ProductRanker service
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ProductRanker } from '@/modules/product/services/product-ranker.service';
import { createMockProduct, createMockProducts } from '../../fixtures/product.fixtures';

describe('ProductRanker', () => {
  let service: ProductRanker;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductRanker],
    }).compile();

    service = module.get<ProductRanker>(ProductRanker);
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
        scores.trendScore * 0.3 +
        scores.profitScore * 0.4 +
        scores.viralityScore * 0.3;

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

  describe('calculateTrendScore', () => {
    it('should give higher score to popular categories', async () => {
      const popularProduct = createMockProduct({
        category: 'Electronics',
      });

      const unpopularProduct = createMockProduct({
        category: 'Automotive',
      });

      const popularScores = await service.calculateScores(popularProduct);
      const unpopularScores = await service.calculateScores(unpopularProduct);

      // Average over multiple runs to account for randomness
      const runs = 10;
      let popularTotal = 0;
      let unpopularTotal = 0;

      for (let i = 0; i < runs; i++) {
        const ps = await service.calculateScores(popularProduct);
        const us = await service.calculateScores(unpopularProduct);
        popularTotal += ps.trendScore;
        unpopularTotal += us.trendScore;
      }

      const popularAvg = popularTotal / runs;
      const unpopularAvg = unpopularTotal / runs;

      expect(popularAvg).toBeGreaterThan(unpopularAvg);
    });

    it('should return score between 0 and 1', async () => {
      const product = createMockProduct();

      const scores = await service.calculateScores(product);

      expect(scores.trendScore).toBeGreaterThanOrEqual(0);
      expect(scores.trendScore).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateViralityScore', () => {
    it('should give higher score to visual categories', async () => {
      const visualProduct = createMockProduct({
        category: 'Electronics',
      });

      const nonVisualProduct = createMockProduct({
        category: 'Books',
      });

      // Average over multiple runs
      const runs = 10;
      let visualTotal = 0;
      let nonVisualTotal = 0;

      for (let i = 0; i < runs; i++) {
        const vs = await service.calculateScores(visualProduct);
        const nvs = await service.calculateScores(nonVisualProduct);
        visualTotal += vs.viralityScore;
        nonVisualTotal += nvs.viralityScore;
      }

      const visualAvg = visualTotal / runs;
      const nonVisualAvg = nonVisualTotal / runs;

      expect(visualAvg).toBeGreaterThan(nonVisualAvg);
    });

    it('should boost score for popular brands', async () => {
      const brandedProduct = createMockProduct({
        brand: 'Apple',
        category: 'Electronics',
      });

      const genericProduct = createMockProduct({
        brand: 'GenericBrand',
        category: 'Electronics',
      });

      // Average over multiple runs
      const runs = 10;
      let brandedTotal = 0;
      let genericTotal = 0;

      for (let i = 0; i < runs; i++) {
        const bs = await service.calculateScores(brandedProduct);
        const gs = await service.calculateScores(genericProduct);
        brandedTotal += bs.viralityScore;
        genericTotal += gs.viralityScore;
      }

      const brandedAvg = brandedTotal / runs;
      const genericAvg = genericTotal / runs;

      expect(brandedAvg).toBeGreaterThan(genericAvg);
    });

    it('should return score between 0 and 1', async () => {
      const product = createMockProduct();

      const scores = await service.calculateScores(product);

      expect(scores.viralityScore).toBeGreaterThanOrEqual(0);
      expect(scores.viralityScore).toBeLessThanOrEqual(1);
    });
  });

  describe('rankProducts', () => {
    it('should sort products by overall score descending', async () => {
      const products = createMockProducts(5);

      const ranked = await service.rankProducts(products);

      // Verify sorted in descending order
      for (let i = 0; i < ranked.length - 1; i++) {
        expect((ranked[i] as any).overallScore).toBeGreaterThanOrEqual((ranked[i + 1] as any).overallScore);
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
