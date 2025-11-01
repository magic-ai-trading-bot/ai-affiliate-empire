import { Test, TestingModule } from '@nestjs/testing';
import { TrendAggregatorService } from '../../../src/modules/product/services/trend-aggregator.service';
import { GoogleTrendsProvider } from '../../../src/modules/product/services/trend-providers/google-trends.provider';
import { TwitterTrendsProvider } from '../../../src/modules/product/services/trend-providers/twitter-trends.provider';
import { RedditTrendsProvider } from '../../../src/modules/product/services/trend-providers/reddit-trends.provider';
import { TiktokTrendsProvider } from '../../../src/modules/product/services/trend-providers/tiktok-trends.provider';
import { TrendCacheService } from '../../../src/common/cache/trend-cache.service';
import { TrendRateLimiterService } from '../../../src/common/rate-limiting/trend-rate-limiter.service';

describe('TrendAggregatorService', () => {
  let service: TrendAggregatorService;
  let googleProvider: jest.Mocked<GoogleTrendsProvider>;
  let twitterProvider: jest.Mocked<TwitterTrendsProvider>;
  let redditProvider: jest.Mocked<RedditTrendsProvider>;
  let tiktokProvider: jest.Mocked<TiktokTrendsProvider>;
  let cacheService: jest.Mocked<TrendCacheService>;
  let rateLimiter: jest.Mocked<TrendRateLimiterService>;

  const mockProduct = {
    id: 'product-123',
    title: 'iPhone 15 Pro',
    category: 'Electronics',
    brand: 'Apple',
  };

  beforeEach(async () => {
    // Create mocks
    const mockGoogleProvider = {
      getTrendScore: jest.fn(),
    };

    const mockTwitterProvider = {
      getViralityScore: jest.fn(),
    };

    const mockRedditProvider = {
      getRedditScore: jest.fn(),
    };

    const mockTiktokProvider = {
      getTiktokScore: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const mockRateLimiter = {
      canMakeRequest: jest.fn(),
      recordRequest: jest.fn(),
      updateSourceStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrendAggregatorService,
        {
          provide: GoogleTrendsProvider,
          useValue: mockGoogleProvider,
        },
        {
          provide: TwitterTrendsProvider,
          useValue: mockTwitterProvider,
        },
        {
          provide: RedditTrendsProvider,
          useValue: mockRedditProvider,
        },
        {
          provide: TiktokTrendsProvider,
          useValue: mockTiktokProvider,
        },
        {
          provide: TrendCacheService,
          useValue: mockCacheService,
        },
        {
          provide: TrendRateLimiterService,
          useValue: mockRateLimiter,
        },
      ],
    }).compile();

    service = module.get<TrendAggregatorService>(TrendAggregatorService);
    googleProvider = module.get(GoogleTrendsProvider);
    twitterProvider = module.get(TwitterTrendsProvider);
    redditProvider = module.get(RedditTrendsProvider);
    tiktokProvider = module.get(TiktokTrendsProvider);
    cacheService = module.get(TrendCacheService);
    rateLimiter = module.get(TrendRateLimiterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTrendScores', () => {
    it('should return cached data if available', async () => {
      const cachedData = {
        scores: {
          googleTrendScore: 0.8,
          twitterScore: 0.7,
          redditScore: 0.6,
          tiktokScore: 0.5,
        },
        source: ['google', 'twitter', 'reddit', 'tiktok'],
        failedSources: [],
        timestamp: new Date(),
      };

      cacheService.get.mockResolvedValue(cachedData);

      const result = await service.getTrendScores(mockProduct);

      expect(cacheService.get).toHaveBeenCalledWith(mockProduct.id);
      expect(result.googleTrendScore).toBe(0.8);
      expect(result.twitterScore).toBe(0.7);
      expect(result.redditScore).toBe(0.6);
      expect(result.tiktokScore).toBe(0.5);
      expect(result.source).toEqual(['google', 'twitter', 'reddit', 'tiktok']);
    });

    it('should fetch from all sources when cache misses', async () => {
      cacheService.get.mockResolvedValue(null);
      rateLimiter.canMakeRequest.mockResolvedValue(true);

      googleProvider.getTrendScore.mockResolvedValue({
        score: 75,
        normalized: 0.75,
        dataPoints: 52,
        timestamp: new Date(),
      });

      twitterProvider.getViralityScore.mockResolvedValue({
        mentions: 150,
        engagement: 1200,
        engagementRate: 8,
        viralityScore: 0.6,
        sentiment: 0.7,
        timestamp: new Date(),
      });

      redditProvider.getRedditScore.mockResolvedValue({
        mentions: 45,
        subreddits: ['technology', 'apple'],
        engagement: 800,
        discussionScore: 0.65,
        timestamp: new Date(),
      });

      tiktokProvider.getTiktokScore.mockResolvedValue({
        videos: 20,
        views: 50000,
        engagement: 5000,
        viralityScore: 0.5,
        hashtags: ['iphone15', 'apple'],
        timestamp: new Date(),
      });

      const result = await service.getTrendScores(mockProduct);

      expect(googleProvider.getTrendScore).toHaveBeenCalledWith(mockProduct.title);
      expect(twitterProvider.getViralityScore).toHaveBeenCalledWith(mockProduct.title);
      expect(redditProvider.getRedditScore).toHaveBeenCalledWith(mockProduct.title);
      expect(tiktokProvider.getTiktokScore).toHaveBeenCalledWith(mockProduct.title);

      expect(result.googleTrendScore).toBe(0.75);
      expect(result.twitterScore).toBe(0.6);
      expect(result.redditScore).toBe(0.65);
      expect(result.tiktokScore).toBe(0.5);
      expect(result.source).toContain('google');
      expect(result.source).toContain('twitter');
      expect(result.source).toContain('reddit');
      expect(result.source).toContain('tiktok');
    });

    it('should handle partial failures gracefully', async () => {
      cacheService.get.mockResolvedValue(null);
      rateLimiter.canMakeRequest.mockResolvedValue(true);

      googleProvider.getTrendScore.mockResolvedValue({
        score: 75,
        normalized: 0.75,
        dataPoints: 52,
        timestamp: new Date(),
      });

      // Twitter fails
      twitterProvider.getViralityScore.mockRejectedValue(new Error('API error'));

      redditProvider.getRedditScore.mockResolvedValue({
        mentions: 45,
        subreddits: ['technology'],
        engagement: 800,
        discussionScore: 0.65,
        timestamp: new Date(),
      });

      tiktokProvider.getTiktokScore.mockResolvedValue({
        videos: 20,
        views: 50000,
        engagement: 5000,
        viralityScore: 0.5,
        hashtags: ['iphone15'],
        timestamp: new Date(),
      });

      const result = await service.getTrendScores(mockProduct);

      expect(result.googleTrendScore).toBe(0.75);
      expect(result.twitterScore).toBe(0.5); // Fallback score
      expect(result.redditScore).toBe(0.65);
      expect(result.tiktokScore).toBe(0.5);
      expect(result.failedSources).toContain('twitter');
      expect(result.source).toContain('google');
      expect(result.source).toContain('reddit');
      expect(result.source).toContain('tiktok');
    });

    it('should use fallback scores when all sources fail', async () => {
      cacheService.get.mockResolvedValue(null);
      rateLimiter.canMakeRequest.mockResolvedValue(true);

      googleProvider.getTrendScore.mockRejectedValue(new Error('API error'));
      twitterProvider.getViralityScore.mockRejectedValue(new Error('API error'));
      redditProvider.getRedditScore.mockRejectedValue(new Error('API error'));
      tiktokProvider.getTiktokScore.mockRejectedValue(new Error('API error'));

      const result = await service.getTrendScores(mockProduct);

      expect(result.googleTrendScore).toBe(0.5);
      expect(result.twitterScore).toBe(0.5);
      expect(result.redditScore).toBe(0.5);
      expect(result.tiktokScore).toBe(0.5);
      expect(result.failedSources).toHaveLength(4);
    });

    it('should cache results after fetching', async () => {
      cacheService.get.mockResolvedValue(null);
      rateLimiter.canMakeRequest.mockResolvedValue(true);

      googleProvider.getTrendScore.mockResolvedValue({
        score: 75,
        normalized: 0.75,
        dataPoints: 52,
        timestamp: new Date(),
      });

      twitterProvider.getViralityScore.mockResolvedValue({
        mentions: 150,
        engagement: 1200,
        engagementRate: 8,
        viralityScore: 0.6,
        sentiment: 0.7,
        timestamp: new Date(),
      });

      redditProvider.getRedditScore.mockResolvedValue({
        mentions: 45,
        subreddits: ['technology'],
        engagement: 800,
        discussionScore: 0.65,
        timestamp: new Date(),
      });

      tiktokProvider.getTiktokScore.mockResolvedValue({
        videos: 20,
        views: 50000,
        engagement: 5000,
        viralityScore: 0.5,
        hashtags: ['iphone15'],
        timestamp: new Date(),
      });

      await service.getTrendScores(mockProduct);

      expect(cacheService.set).toHaveBeenCalledWith(
        mockProduct.id,
        expect.objectContaining({
          scores: expect.objectContaining({
            googleTrendScore: 0.75,
            twitterScore: 0.6,
            redditScore: 0.65,
            tiktokScore: 0.5,
          }),
          source: expect.arrayContaining(['google', 'twitter', 'reddit', 'tiktok']),
        }),
      );
    });

    it('should calculate weighted aggregated score correctly', async () => {
      cacheService.get.mockResolvedValue(null);
      rateLimiter.canMakeRequest.mockResolvedValue(true);

      googleProvider.getTrendScore.mockResolvedValue({
        score: 80,
        normalized: 0.8,
        dataPoints: 52,
        timestamp: new Date(),
      });

      twitterProvider.getViralityScore.mockResolvedValue({
        mentions: 150,
        engagement: 1200,
        engagementRate: 8,
        viralityScore: 0.6,
        sentiment: 0.7,
        timestamp: new Date(),
      });

      redditProvider.getRedditScore.mockResolvedValue({
        mentions: 45,
        subreddits: ['technology'],
        engagement: 800,
        discussionScore: 0.4,
        timestamp: new Date(),
      });

      tiktokProvider.getTiktokScore.mockResolvedValue({
        videos: 20,
        views: 50000,
        engagement: 5000,
        viralityScore: 0.2,
        hashtags: ['iphone15'],
        timestamp: new Date(),
      });

      const result = await service.getTrendScores(mockProduct);

      // Expected: 0.8 * 0.3 + 0.6 * 0.25 + 0.4 * 0.25 + 0.2 * 0.2 = 0.24 + 0.15 + 0.1 + 0.04 = 0.53
      expect(result.aggregatedScore).toBeCloseTo(0.53, 2);
    });
  });
});
