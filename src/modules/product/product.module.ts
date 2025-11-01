import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRanker } from './services/product-ranker.service';
import { AmazonService } from './services/amazon.service';
import { TrendAggregatorService } from './services/trend-aggregator.service';
import { GoogleTrendsProvider } from './services/trend-providers/google-trends.provider';
import { TwitterTrendsProvider } from './services/trend-providers/twitter-trends.provider';
import { RedditTrendsProvider } from './services/trend-providers/reddit-trends.provider';
import { TiktokTrendsProvider } from './services/trend-providers/tiktok-trends.provider';
import { TrendCacheService } from '../../common/cache/trend-cache.service';
import { TrendRateLimiterService } from '../../common/rate-limiting/trend-rate-limiter.service';
import { PrismaService } from '../../common/database/prisma.service';

@Module({
  controllers: [ProductController],
  providers: [
    ProductService,
    ProductRanker,
    AmazonService,
    TrendAggregatorService,
    GoogleTrendsProvider,
    TwitterTrendsProvider,
    RedditTrendsProvider,
    TiktokTrendsProvider,
    TrendCacheService,
    TrendRateLimiterService,
    PrismaService,
  ],
  exports: [ProductService, ProductRanker],
})
export class ProductModule {}
