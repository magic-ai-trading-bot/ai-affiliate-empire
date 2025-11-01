import { Injectable } from '@nestjs/common';
import { TrendAggregatorService } from './trend-aggregator.service';

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
  trendSources?: string[]; // Track which sources were used
}

@Injectable()
export class ProductRanker {
  private readonly TREND_WEIGHT = 0.3;
  private readonly PROFIT_WEIGHT = 0.4;
  private readonly VIRALITY_WEIGHT = 0.3;

  constructor(private readonly trendAggregator: TrendAggregatorService) {}

  /**
   * Calculate comprehensive ranking scores for a product
   */
  async calculateScores(product: Product): Promise<RankingScores> {
    // Get real trend data from aggregator
    const trendData = await this.trendAggregator.getTrendScores(product);

    const trendScore = trendData.googleTrendScore; // Search interest
    const profitScore = this.calculateProfitScore(product);
    const viralityScore = trendData.aggregatedScore; // Combined social score

    const overallScore =
      trendScore * this.TREND_WEIGHT +
      profitScore * this.PROFIT_WEIGHT +
      viralityScore * this.VIRALITY_WEIGHT;

    return {
      trendScore,
      profitScore,
      viralityScore,
      overallScore,
      trendSources: trendData.source,
    };
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
