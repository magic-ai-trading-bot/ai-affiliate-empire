import { Injectable } from '@nestjs/common';

interface Product {
  id: string;
  title: string;
  price: number;
  commission: number;
  category?: string;
  brand?: string;
}

interface RankingScores {
  trendScore: number;
  profitScore: number;
  viralityScore: number;
  overallScore: number;
}

@Injectable()
export class ProductRanker {
  private readonly TREND_WEIGHT = 0.3;
  private readonly PROFIT_WEIGHT = 0.4;
  private readonly VIRALITY_WEIGHT = 0.3;

  /**
   * Calculate comprehensive ranking scores for a product
   */
  async calculateScores(product: Product): Promise<RankingScores> {
    const trendScore = await this.calculateTrendScore(product);
    const profitScore = this.calculateProfitScore(product);
    const viralityScore = await this.calculateViralityScore(product);

    const overallScore =
      trendScore * this.TREND_WEIGHT +
      profitScore * this.PROFIT_WEIGHT +
      viralityScore * this.VIRALITY_WEIGHT;

    return {
      trendScore,
      profitScore,
      viralityScore,
      overallScore,
    };
  }

  /**
   * Calculate trend score based on Google Trends and market demand
   * TODO: Integrate with Google Trends API
   */
  private async calculateTrendScore(product: Product): Promise<number> {
    // Placeholder implementation
    // In production, this would query Google Trends API

    // Basic heuristic: newer products in popular categories score higher
    const popularCategories = [
      'Electronics',
      'Health & Fitness',
      'Home & Kitchen',
      'Beauty',
      'Sports',
    ];

    let score = 0.5; // Base score

    if (product.category && popularCategories.includes(product.category)) {
      score += 0.3;
    }

    // Add some randomness to simulate trend variance
    score += Math.random() * 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate profit score based on commission rate and price
   */
  private calculateProfitScore(product: Product): number {
    const commissionAmount = (product.price * product.commission) / 100;

    // Normalize score: $10+ commission = 1.0 score
    let score = commissionAmount / 10;

    // Cap at 1.0
    score = Math.min(score, 1.0);

    // Boost products with commission > 5%
    if (product.commission > 5) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate virality score based on social media potential
   * TODO: Integrate with Twitter/Reddit/TikTok APIs
   */
  private async calculateViralityScore(product: Product): Promise<number> {
    // Placeholder implementation
    // In production, this would analyze social media mentions and engagement

    let score = 0.5; // Base score

    // Visual products tend to perform better on social media
    const visualCategories = [
      'Electronics',
      'Beauty',
      'Fashion',
      'Home & Kitchen',
      'Sports',
    ];

    if (product.category && visualCategories.includes(product.category)) {
      score += 0.2;
    }

    // Brand recognition helps virality
    const popularBrands = ['Apple', 'Samsung', 'Nike', 'Sony', 'Dyson'];
    if (product.brand && popularBrands.some((b) => product.brand?.includes(b))) {
      score += 0.2;
    }

    // Add variance
    score += Math.random() * 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Rank multiple products and return sorted by overall score
   */
  async rankProducts(products: Product[]): Promise<(Product & RankingScores)[]> {
    const scored = await Promise.all(
      products.map(async (product) => {
        const scores = await this.calculateScores(product);
        return {
          ...product,
          ...scores,
        };
      }),
    );

    return scored.sort((a, b) => b.overallScore - a.overallScore);
  }
}
